import Papa from 'papaparse';

// Dynamically discover whatever CSV files currently exist on disk without throwing compile-time errors if a file is removed
const diskCsvFiles: Record<string, string> = import.meta.glob('../../data/*.csv', {
  query: '?raw',
  import: 'default',
  eager: true
});

const FALLBACK_HEADERS: Record<CsvCategory, string> = {
  'bdms': 'BDM Code,Name,Territory,Phone,Joined',
  'outlets': 'Outlet Code,Outlet Name,Type,Town,Owner Name,Phone,Onboarded,Credit Days,Latitude,Longitude,Status',
  'billing-monthly': 'Outlet Code,Month,Units,Value',
  'visit-log': 'Visit ID,BDM Code,BDM Name,Outlet Code,Outlet Name,Visit Date,Check In,Duration (mins),Purpose,Remarks'
};

export function getDiskCsvText(fileName: string, category?: CsvCategory): string {
  for (const [key, content] of Object.entries(diskCsvFiles)) {
    if (key.endsWith(fileName) || key.includes(fileName)) {
      if (typeof content === 'string' && content.trim().length > 0) {
        return content;
      }
    }
  }
  return '';
}

import {
  BDM,
  CommercialStatus,
  EnrichedOutlet,
  OutletBillingSummary,
  OutletType,
  RawOutlet,
  VisitLog
} from '../types/data';
import { normalizeTown } from './townNormalizer';
import { evaluateVisitTrust } from './trustEngine';
import { evaluateOutletPriority } from './prioritization';
import { CsvCategory, getCategoryCsv } from './dbStore';
import { getLocalMergedOutlets } from './backendSyncService';

export interface MissingFileInfo {
  category: CsvCategory;
  fileName: string;
  displayName: string;
  reason: string;
}

export interface Dataset {
  bdms: BDM[];
  outlets: EnrichedOutlet[];
  visits: VisitLog[];
  monthlyRevenue: { month: string; value: number; units: number; activeOutlets: number }[];
  missingFiles: MissingFileInfo[];
  summary: {
    totalMasterOutlets: number;
    duplicateSuspectCount: number;
    effectiveRealCounters: number;
    activeJulyOutlets: number;
    fadingOutlets: number;
    dormantOutlets: number;
    ghostOutlets: number;
    totalVisits: number;
    visitsToGhostOutlets: number;
    total6MRevenue: number;
    total6MUnits: number;
    averageTrustScore: number;
  };
}

export function getDefaultCsvText(category: CsvCategory): string {
  switch (category) {
    case 'bdms':
      return getDiskCsvText('bdms.csv', 'bdms') || FALLBACK_HEADERS['bdms'];
    case 'outlets':
      return getDiskCsvText('outlets.csv', 'outlets') || FALLBACK_HEADERS['outlets'];
    case 'billing-monthly':
      return getDiskCsvText('billing-monthly.csv', 'billing-monthly') || FALLBACK_HEADERS['billing-monthly'];
    case 'visit-log':
      return getDiskCsvText('visit-log.csv', 'visit-log') || FALLBACK_HEADERS['visit-log'];
  }
}

let cachedDataset: Dataset | null = null;
type DatasetChangeListener = (dataset: Dataset) => void;
const changeListeners: Set<DatasetChangeListener> = new Set();

export function subscribeDatasetChange(listener: DatasetChangeListener): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

function notifyDatasetChanged(dataset: Dataset) {
  for (const listener of changeListeners) {
    try {
      listener(dataset);
    } catch (e) {
      console.error('Error in dataset subscriber listener', e);
    }
  }
}

export interface RawCsvTexts {
  bdmsText?: string;
  billingText?: string;
  outletsText?: string;
  visitsText?: string;
}

/**
 * Parses and enriches dataset synchronously from raw strings with zero-crash resiliency
 */
export function buildDatasetFromRaw(texts?: RawCsvTexts): Dataset {
  const bdmsCsvText = texts?.bdmsText !== undefined ? texts.bdmsText : getDiskCsvText('bdms.csv', 'bdms');
  const billingCsvText = texts?.billingText !== undefined ? texts.billingText : getDiskCsvText('billing-monthly.csv', 'billing-monthly');
  const outletsCsvText = texts?.outletsText !== undefined ? texts.outletsText : getDiskCsvText('outlets.csv', 'outlets');
  const visitsCsvText = texts?.visitsText !== undefined ? texts.visitsText : getDiskCsvText('visit-log.csv', 'visit-log');

  const missingFiles: MissingFileInfo[] = [];

  // 1. Parse BDMs
  const bdmParsed = Papa.parse<any>(bdmsCsvText || '', { header: true, skipEmptyLines: true }).data || [];
  const bdms: BDM[] = bdmParsed
    .filter((row) => (row && (row['BDM Code'] || row['Name'] || row['bdm_code'] || row['name'] || '').trim().length > 0))
    .map((row) => ({
      code: (row['BDM Code'] || row['bdm_code'] || '').trim(),
      name: (row['Name'] || row['name'] || '').trim(),
      territory: (row['Territory'] || row['territory'] || '').trim(),
      phone: (row['Phone'] || row['phone'] || '').trim(),
      joinedDate: (row['Joined'] || row['joined'] || '').trim()
    }));

  if (bdms.length === 0) {
    missingFiles.push({
      category: 'bdms',
      fileName: 'bdms.csv',
      displayName: 'BDM Field Officers',
      reason: 'No BDM officer records found in file'
    });
  }

  const territoryToBdmMap = new Map<string, BDM>();
  const bdmCodeMap = new Map<string, BDM>();
  for (const bdm of bdms) {
    if (bdm.territory) territoryToBdmMap.set(bdm.territory.toLowerCase(), bdm);
    if (bdm.code) bdmCodeMap.set(bdm.code, bdm);
  }

  // 2. Parse Billing
  const billingParsed = Papa.parse<any>(billingCsvText || '', { header: true, skipEmptyLines: true }).data || [];
  const outletBillingMap = new Map<string, { [month: string]: { units: number; val: number } }>();
  const monthlyAgg: Record<string, { value: number; units: number; outlets: Set<string> }> = {
    '2026-02': { value: 0, units: 0, outlets: new Set() },
    '2026-03': { value: 0, units: 0, outlets: new Set() },
    '2026-04': { value: 0, units: 0, outlets: new Set() },
    '2026-05': { value: 0, units: 0, outlets: new Set() },
    '2026-06': { value: 0, units: 0, outlets: new Set() },
    '2026-07': { value: 0, units: 0, outlets: new Set() }
  };

  let validBillingRows = 0;
  for (const row of billingParsed) {
    if (!row) continue;
    const code = (row['Outlet Code'] || row['outlet_code'] || '').trim();
    const month = (row['Month'] || row['month'] || '').trim();
    const units = parseInt(row['Units'] || row['units'], 10) || 0;
    const value = parseFloat(row['Value'] || row['value']) || 0;

    if (!code || !month) continue;

    validBillingRows++;
    if (!outletBillingMap.has(code)) {
      outletBillingMap.set(code, {});
    }
    outletBillingMap.get(code)![month] = { units, val: value };

    if (monthlyAgg[month]) {
      monthlyAgg[month].value += value;
      monthlyAgg[month].units += units;
      monthlyAgg[month].outlets.add(code);
    } else {
      monthlyAgg[month] = { value, units, outlets: new Set([code]) };
    }
  }

  if (validBillingRows === 0) {
    missingFiles.push({
      category: 'billing-monthly',
      fileName: 'billing-monthly.csv',
      displayName: 'Monthly Billing Records',
      reason: 'No monthly billing transactions found in file'
    });
  }

  // 3. Parse Outlets
  const outletsParsed = Papa.parse<any>(outletsCsvText || '', { header: true, skipEmptyLines: true }).data || [];
  const rawOutlets: RawOutlet[] = outletsParsed
    .filter((row) => (row && (row['Outlet Code'] || row['Outlet Name'] || row['outlet_code'] || row['outlet_name'] || '').trim().length > 0))
    .map((row) => {
      const rawCredit = (row['Credit Days'] || row['credit_days'] || '').toString().trim();
      let creditDays = 0;
      let creditDaysUnknown = false;
      if (!rawCredit) {
        creditDays = 0;
        creditDaysUnknown = true;
      } else if (rawCredit.toLowerCase() === 'cod') {
        creditDays = 0;
        creditDaysUnknown = false;
      } else {
        const match = rawCredit.match(/\d+/);
        if (match) {
          creditDays = parseInt(match[0], 10);
          creditDaysUnknown = false;
        } else {
          creditDays = 0;
          creditDaysUnknown = true;
        }
      }

      const latVal = row['Latitude'] || row['latitude'];
      const lngVal = row['Longitude'] || row['longitude'];
      const lat = latVal ? parseFloat(latVal) : undefined;
      const lng = lngVal ? parseFloat(lngVal) : undefined;

      const code = (row['Outlet Code'] || row['outlet_code'] || '').trim();
      const town = (row['Town'] || row['town'] || '').trim();

      return {
        code,
        name: (row['Outlet Name'] || row['outlet_name'] || '').trim(),
        type: (row['Type'] || row['type'] || 'General Trade').trim() as OutletType,
        town,
        normalizedTown: normalizeTown(town),
        ownerName: (row['Owner Name'] || row['owner_name'] || '').trim(),
        phone: (row['Phone'] || row['phone'] || '').trim(),
        onboardedDate: (row['Onboarded'] || row['onboarded'] || '').trim(),
        creditDaysRaw: rawCredit,
        creditDays,
        creditDaysUnknown,
        latitude: isNaN(lat as number) ? undefined : lat,
        longitude: isNaN(lng as number) ? undefined : lng,
        rawStatus: (row['Status'] || row['status'] || '').trim()
      };
    });

  if (rawOutlets.length === 0) {
    missingFiles.push({
      category: 'outlets',
      fileName: 'outlets.csv',
      displayName: 'Retail Outlets Master',
      reason: 'No retail outlet records found in file'
    });
  }

  // Duplicate Suspect Detection
  const nameMap = new Map<string, string[]>();
  const coordMap = new Map<string, string[]>();

  for (const outlet of rawOutlets) {
    const cleanName = outlet.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanName.length > 3) {
      if (!nameMap.has(cleanName)) nameMap.set(cleanName, []);
      nameMap.get(cleanName)!.push(outlet.code);
    }

    if (outlet.latitude && outlet.longitude) {
      const coordKey = `${outlet.latitude.toFixed(4)},${outlet.longitude.toFixed(4)}`;
      if (!coordMap.has(coordKey)) coordMap.set(coordKey, []);
      coordMap.get(coordKey)!.push(outlet.code);
    }
  }

  // 4. Enrich Outlets with Billing & Territory (Incorporating Master Merges)
  const activeMerges = getLocalMergedOutlets();
  const mergeAliasMap = new Map<string, string>(); // secondaryCode -> primaryCode
  const primaryMergedChildren = new Map<string, string[]>(); // primaryCode -> secondaryCodes[]
  activeMerges.forEach((m) => {
    mergeAliasMap.set(m.secondaryCode, m.primaryCode);
    if (!primaryMergedChildren.has(m.primaryCode)) primaryMergedChildren.set(m.primaryCode, []);
    primaryMergedChildren.get(m.primaryCode)!.push(m.secondaryCode);
  });

  const enrichedOutlets: EnrichedOutlet[] = rawOutlets.map((outlet) => {
    const isMergedAlias = mergeAliasMap.has(outlet.code);
    const mergedIntoCode = mergeAliasMap.get(outlet.code);
    const childrenCodes = primaryMergedChildren.get(outlet.code) || [];

    // Base billing for this code
    const bMap = { ...(outletBillingMap.get(outlet.code) || {}) };

    // If this is a primary master record, consolidate all merged secondary records into its billing
    if (childrenCodes.length > 0) {
      for (const childCode of childrenCodes) {
        const childBMap = outletBillingMap.get(childCode) || {};
        for (const [mKey, cData] of Object.entries(childBMap)) {
          if (!bMap[mKey]) {
            bMap[mKey] = { val: 0, units: 0 };
          }
          bMap[mKey] = {
            val: bMap[mKey].val + cData.val,
            units: bMap[mKey].units + cData.units
          };
        }
      }
    }

    const febVal = bMap['2026-02']?.val || 0;
    const marVal = bMap['2026-03']?.val || 0;
    const aprVal = bMap['2026-04']?.val || 0;
    const mayVal = bMap['2026-05']?.val || 0;
    const junVal = bMap['2026-06']?.val || 0;
    const julVal = bMap['2026-07']?.val || 0;

    const febUnits = bMap['2026-02']?.units || 0;
    const marUnits = bMap['2026-03']?.units || 0;
    const aprUnits = bMap['2026-04']?.units || 0;
    const mayUnits = bMap['2026-05']?.units || 0;
    const junUnits = bMap['2026-06']?.units || 0;
    const julUnits = bMap['2026-07']?.units || 0;

    const totalVal = febVal + marVal + aprVal + mayVal + junVal + julVal;
    const totalUnits = febUnits + marUnits + aprUnits + mayUnits + junUnits + julUnits;
    const peakMonthVal = Math.max(febVal, marVal, aprVal, mayVal, junVal, julVal);
    const monthVals: [string, number][] = [
      ['Feb', febVal],
      ['Mar', marVal],
      ['Apr', aprVal],
      ['May', mayVal],
      ['Jun', junVal],
      ['Jul', julVal]
    ];
    let peakMonthName = 'Feb';
    let maxV = -1;
    for (const [mName, v] of monthVals) {
      if (v > maxV) {
        maxV = v;
        peakMonthName = mName;
      }
    }

    let lastBilledMonth: string | null = null;
    const monthsRev = ['2026-07', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02'];
    for (const m of monthsRev) {
      if (bMap[m]?.val > 0) {
        lastBilledMonth = m;
        break;
      }
    }

    const activeInJuly = julVal > 0;
    const isFading = peakMonthVal >= 200000 && julVal === 0 && (febVal > 0 || marVal > 0);

    let commercialStatus: CommercialStatus = 'Ghost';
    if (activeInJuly) {
      commercialStatus = 'Active';
    } else if (junVal > 0) {
      commercialStatus = 'At-Risk';
    } else if (totalVal > 0) {
      commercialStatus = 'Dormant';
    } else {
      commercialStatus = 'Ghost';
    }

    // BDM assignment based on canonical territory
    const assignedBdm = territoryToBdmMap.get(outlet.normalizedTown.toLowerCase());
    const bdmCode = assignedBdm ? assignedBdm.code : 'UNASSIGNED';
    const bdmName = assignedBdm ? assignedBdm.name : 'Unassigned Territory';

    // Duplicate suspect check - if already merged as alias, it's resolved
    const cleanName = outlet.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const coordKey = outlet.latitude && outlet.longitude ? `${outlet.latitude.toFixed(4)},${outlet.longitude.toFixed(4)}` : '';
    const sameNameList = nameMap.get(cleanName) || [];
    const sameCoordList = coordKey ? coordMap.get(coordKey) || [] : [];

    const isDuplicateSuspect = !isMergedAlias && (sameCoordList.length > 1 || sameNameList.length > 1);
    const duplicateGroupKey = sameCoordList.length > 1 ? `COORD-${coordKey}` : sameNameList.length > 1 ? `NAME-${cleanName}` : undefined;

    const billingSummary: OutletBillingSummary = {
      feb26Units: febUnits,
      feb26Val: febVal,
      mar26Units: marUnits,
      mar26Val: marVal,
      apr26Units: aprUnits,
      apr26Val: aprVal,
      may26Units: mayUnits,
      may26Val: mayVal,
      jun26Units: junUnits,
      jun26Val: junVal,
      jul26Units: julUnits,
      jul26Val: julVal,
      totalUnits6M: totalUnits,
      totalValue6M: totalVal,
      lastBilledMonth,
      activeInJuly,
      peakMonthVal,
      peakMonthName,
      isFading
    };

    const priorityEval = evaluateOutletPriority(billingSummary, outlet.creditDays, outlet.type);

    return {
      ...outlet,
      assignedBdmCode: bdmCode,
      assignedBdmName: bdmName,
      commercialStatus,
      billing: billingSummary,
      totalVisitsLogged: 0,
      isDuplicateSuspect,
      duplicateGroupKey,
      isMergedAlias,
      mergedIntoCode,
      hasMissingCoords: !outlet.latitude || !outlet.longitude,
      priorityTier: priorityEval.tier,
      priorityScore: priorityEval.score
    };
  });

  const outletLookup = new Map<string, EnrichedOutlet>();
  for (const o of enrichedOutlets) {
    outletLookup.set(o.code, o);
  }

  // 5. Parse Visit Logs & compute Trust Scores
  const visitsParsed = Papa.parse<any>(visitsCsvText || '', { header: true, skipEmptyLines: true }).data || [];
  let totalTrustSum = 0;
  let visitsToGhostCount = 0;

  const visits: VisitLog[] = visitsParsed
    .filter((row) => (row && (row['Visit ID'] || row['Outlet Code'] || row['visit_id'] || row['outlet_code'] || '').trim().length > 0))
    .map((row) => {
      const rawDur = row['Duration (mins)'] || row['duration'] ? parseFloat(row['Duration (mins)'] || row['duration']) : undefined;
      const durationMins = isNaN(rawDur as number) ? undefined : rawDur;
      const outletCode = (row['Outlet Code'] || row['outlet_code'] || '').trim();
      const targetOutlet = outletLookup.get(outletCode);

      const everBilled = targetOutlet ? targetOutlet.billing.totalValue6M > 0 : false;
      const activeJuly = targetOutlet ? targetOutlet.billing.activeInJuly : false;

      if (!everBilled) {
        visitsToGhostCount++;
      }

      const trustEval = evaluateVisitTrust(
        durationMins,
        row['Remarks'] || row['remarks'],
        row['Purpose'] || row['purpose'],
        everBilled,
        activeJuly
      );

      totalTrustSum += trustEval.score;

      const visitDateVal = (row['Visit Date'] || row['Date'] || row['visit_date'] || row['date'] || '').trim();

      if (targetOutlet) {
        targetOutlet.totalVisitsLogged += 1;
        targetOutlet.lastVisitDate = visitDateVal;
        targetOutlet.lastVisitRemarks = (row['Remarks'] || row['remarks'] || '').trim();
      }

      return {
        visitId: (row['Visit ID'] || row['visit_id'] || '').trim(),
        bdmCode: (row['BDM Code'] || row['bdm_code'] || '').trim(),
        bdmName: (row['BDM Name'] || row['bdm_name'] || '').trim(),
        outletCode,
        outletName: (row['Outlet Name'] || row['outlet_name'] || '').trim(),
        visitDate: visitDateVal,
        checkInTime: (row['Check In'] || row['check_in'] || '').trim(),
        durationMins,
        purpose: (row['Purpose'] || row['purpose'] || '').trim(),
        remarks: (row['Remarks'] || row['remarks'] || '').trim(),
        trustScore: trustEval.score,
        trustFlags: trustEval.flags,
        isDriveBy: trustEval.isDriveBy
      };
    });

  if (visits.length === 0) {
    missingFiles.push({
      category: 'visit-log',
      fileName: 'visit-log.csv',
      displayName: 'Field Visit Audit Logs',
      reason: 'No field visit log records found in file'
    });
  }

  // Calculate monthly timeline metrics
  const monthlyRevenue = Object.entries(monthlyAgg).map(([month, data]) => ({
    month,
    value: data.value,
    units: data.units,
    activeOutlets: data.outlets.size
  }));

  // Summary Metrics (Canonical accounts, excluding merged aliases)
  const canonicalOutlets = enrichedOutlets.filter((o) => !o.isMergedAlias);
  const totalMasterOutlets = canonicalOutlets.length;
  const duplicateSuspectCount = canonicalOutlets.filter((o) => o.isDuplicateSuspect).length;
  const effectiveRealCounters = Math.max(0, totalMasterOutlets - Math.floor(duplicateSuspectCount / 2));
  const activeJulyOutlets = canonicalOutlets.filter((o) => o.commercialStatus === 'Active').length;
  const fadingOutlets = canonicalOutlets.filter((o) => o.commercialStatus === 'At-Risk').length;
  const dormantOutlets = canonicalOutlets.filter((o) => o.commercialStatus === 'Dormant').length;
  const ghostOutlets = canonicalOutlets.filter((o) => o.commercialStatus === 'Ghost').length;
  const totalVisits = visits.length;
  const averageTrustScore = totalVisits > 0 ? Math.round(totalTrustSum / totalVisits) : 0;

  let total6MRevenue = 0;
  let total6MUnits = 0;
  for (const m of monthlyRevenue) {
    total6MRevenue += m.value;
    total6MUnits += m.units;
  }

  const result: Dataset = {
    bdms,
    outlets: enrichedOutlets,
    visits,
    monthlyRevenue,
    missingFiles,
    summary: {
      totalMasterOutlets,
      duplicateSuspectCount,
      effectiveRealCounters,
      activeJulyOutlets,
      fadingOutlets,
      dormantOutlets,
      ghostOutlets,
      totalVisits,
      visitsToGhostOutlets: visitsToGhostCount,
      total6MRevenue,
      total6MUnits,
      averageTrustScore
    }
  };

  return result;
}

/**
 * Loads and enriches dataset asynchronously from SQLite database, falling back to bundled CSVs
 */
export async function loadAndEnrichDatasetAsync(forceReload = false): Promise<Dataset> {
  if (cachedDataset && !forceReload) {
    return cachedDataset;
  }

  try {
    const [bdmsCustom, outletsCustom, billingCustom, visitsCustom] = await Promise.all([
      getCategoryCsv('bdms'),
      getCategoryCsv('outlets'),
      getCategoryCsv('billing-monthly'),
      getCategoryCsv('visit-log')
    ]);

    const dataset = buildDatasetFromRaw({
      bdmsText: bdmsCustom !== null ? bdmsCustom : getDiskCsvText('bdms.csv', 'bdms'),
      outletsText: outletsCustom !== null ? outletsCustom : getDiskCsvText('outlets.csv', 'outlets'),
      billingText: billingCustom !== null ? billingCustom : getDiskCsvText('billing-monthly.csv', 'billing-monthly'),
      visitsText: visitsCustom !== null ? visitsCustom : getDiskCsvText('visit-log.csv', 'visit-log')
    });

    cachedDataset = dataset;
    notifyDatasetChanged(dataset);
    return dataset;
  } catch (err) {
    console.warn('Failed to load from SQLite database, falling back to bundled CSVs', err);
    const dataset = buildDatasetFromRaw();
    cachedDataset = dataset;
    notifyDatasetChanged(dataset);
    return dataset;
  }
}

/**
 * Synchronous initial load helper for instant startup
 */
export function loadAndEnrichDataset(): Dataset {
  if (cachedDataset) {
    return cachedDataset;
  }
  cachedDataset = buildDatasetFromRaw();
  return cachedDataset;
}

/**
 * Force-reloads the dataset from SQLite database and notifies all active components
 */
export async function reloadDataset(): Promise<Dataset> {
  return loadAndEnrichDatasetAsync(true);
}
