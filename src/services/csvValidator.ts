import Papa from 'papaparse';
import { CsvCategory } from './dbStore';

export interface CategorySchema {
  category: CsvCategory;
  displayName: string;
  primaryKey: string[];
  requiredHeaders: string[];
  optionalHeaders: string[];
  description: string;
}

export const CATEGORY_SCHEMAS: Record<CsvCategory, CategorySchema> = {
  bdms: {
    category: 'bdms',
    displayName: 'Sales Managers List',
    primaryKey: ['BDM Code'],
    requiredHeaders: ['BDM Code', 'Name', 'Territory'],
    optionalHeaders: ['Phone', 'Joined', 'BDM Name'],
    description: 'Master list of Business Development Managers and assigned territory codes.'
  },
  outlets: {
    category: 'outlets',
    displayName: 'Store Master List',
    primaryKey: ['Outlet Code'],
    requiredHeaders: ['Outlet Code', 'Outlet Name', 'Type', 'Town'],
    optionalHeaders: ['Owner Name', 'Phone', 'Onboarded', 'Credit Days', 'Assigned BDM Code', 'Assigned BDM Name', 'Latitude', 'Longitude', 'Status'],
    description: 'Master commercial store list with geo-coordinates, town assignment, and credit terms.'
  },
  'billing-monthly': {
    category: 'billing-monthly',
    displayName: 'Monthly Sales Data',
    primaryKey: ['Outlet Code', 'Month'],
    requiredHeaders: ['Outlet Code', 'Month', 'Units', 'Value'],
    optionalHeaders: ['Outlet Name'],
    description: 'Historical 6-month unit sales and billed revenue per store.'
  },
  'visit-log': {
    category: 'visit-log',
    displayName: 'Field Visit History',
    primaryKey: ['Visit ID'],
    requiredHeaders: ['Visit ID', 'Outlet Code', 'BDM Code'],
    optionalHeaders: ['Visit Date', 'Date', 'Outlet Name', 'BDM Name', 'Check In', 'Duration (mins)', 'Purpose', 'Remarks', 'Latitude', 'Longitude'],
    description: 'Field visit records with notes, orders, and store audit checklists.'
  }
};

export const HEADER_ALIASES: Record<string, string[]> = {
  'Date': ['date', 'visit date', 'visit_date', 'visitdate', 'log date', 'log_date', 'timestamp', 'time'],
  'Visit Date': ['visit date', 'visit_date', 'visitdate', 'date', 'log date', 'log_date', 'timestamp'],
  'Visit ID': ['visit id', 'visit_id', 'visitid', 'id', 'log id', 'log_id'],
  'Outlet Code': ['outlet code', 'outlet_code', 'outletcode', 'store code', 'store_code', 'shop code', 'code'],
  'BDM Code': ['bdm code', 'bdm_code', 'bdmcode', 'officer code', 'officer_code', 'executive code'],
  'Name': ['name', 'bdm name', 'bdm_name', 'officer name', 'full name'],
  'BDM Name': ['bdm name', 'bdm_name', 'name', 'officer name', 'executive name'],
  'Territory': ['territory', 'region', 'area', 'zone'],
  'Outlet Name': ['outlet name', 'outlet_name', 'outletname', 'store name', 'shop name'],
  'Type': ['type', 'format', 'outlet type', 'channel', 'category'],
  'Town': ['town', 'city', 'location', 'district'],
  'Month': ['month', 'billing month', 'billing_month', 'period', 'date'],
  'Units': ['units', 'quantity', 'qty', 'volume', 'sales units'],
  'Value': ['value', 'amount', 'revenue', 'billed value', 'invoiced value', 'sales value', 'turnover']
};

export function isHeaderMatched(reqHeader: string, detectedHeaders: string[]): boolean {
  const reqLower = reqHeader.trim().toLowerCase();
  const normalizedDetected = detectedHeaders.map((h) => h.trim().toLowerCase());
  if (normalizedDetected.includes(reqLower)) return true;

  const aliases = HEADER_ALIASES[reqHeader] || [];
  if (aliases.some((alias) => normalizedDetected.includes(alias.toLowerCase()))) {
    return true;
  }

  // Substring or alphanumeric match
  const cleanReq = reqLower.replace(/[^a-z0-9]/g, '');
  return normalizedDetected.some((h) => {
    const cleanDet = h.replace(/[^a-z0-9]/g, '');
    return cleanDet === cleanReq || (cleanReq.length > 3 && (cleanDet.includes(cleanReq) || cleanReq.includes(cleanDet)));
  });
}

export interface ValidationResult {
  isValid: boolean;
  category: CsvCategory | null;
  detectedHeaders: string[];
  matchedRequiredHeaders: string[];
  missingRequiredHeaders: string[];
  totalRows: number;
  validRows: number;
  previewRows: Record<string, any>[];
  errors: string[];
  warnings: string[];
}

/**
 * Auto-detect category from column headers or filename with fuzzy alias support
 */
export function detectCategory(headers: string[], fileName = ''): CsvCategory | null {
  const cleanHeaders = headers.map((h) => h.trim().toLowerCase());
  const lowerFileName = fileName.toLowerCase();

  // 1. Explicit filename matches
  if (lowerFileName.includes('outlet') || lowerFileName.includes('store') || lowerFileName.includes('counter') || lowerFileName.includes('retail')) {
    return 'outlets';
  }
  if (lowerFileName.includes('billing') || lowerFileName.includes('revenue') || lowerFileName.includes('sales_monthly') || lowerFileName.includes('monthly_billing')) {
    return 'billing-monthly';
  }
  if (lowerFileName.includes('bdm') || lowerFileName.includes('officer') || lowerFileName.includes('manager') || lowerFileName.includes('rep') || lowerFileName.includes('executive')) {
    return 'bdms';
  }
  if (lowerFileName.includes('visit') || lowerFileName.includes('audit') || lowerFileName.includes('log') || lowerFileName.includes('checklist') || lowerFileName.includes('field')) {
    return 'visit-log';
  }

  // 2. Header fingerprint matching using aliases
  const hasOutletCode = isHeaderMatched('Outlet Code', headers) || cleanHeaders.some((h) => h.includes('outlet') || h.includes('store') || h.includes('shop') || h.includes('counter'));
  const hasMonth = isHeaderMatched('Month', headers) || cleanHeaders.some((h) => h.includes('month') || h.includes('period') || h.includes('billing_month'));
  const hasUnits = isHeaderMatched('Units', headers) || cleanHeaders.some((h) => h.includes('unit') || h.includes('qty') || h.includes('quantity') || h.includes('volume'));
  const hasValue = isHeaderMatched('Value', headers) || cleanHeaders.some((h) => h.includes('val') || h.includes('amount') || h.includes('revenue') || h.includes('turnover') || h.includes('sales'));

  if (hasMonth && (hasUnits || hasValue)) {
    return 'billing-monthly';
  }

  const hasVisitId = isHeaderMatched('Visit ID', headers) || cleanHeaders.some((h) => h.includes('visit') || h.includes('checkin') || h.includes('check in') || h.includes('log_id'));
  if (hasVisitId) {
    return 'visit-log';
  }

  const hasBdmCode = isHeaderMatched('BDM Code', headers) || cleanHeaders.some((h) => h.includes('bdm') || h.includes('officer') || h.includes('executive'));
  const hasTerritory = isHeaderMatched('Territory', headers) || cleanHeaders.some((h) => h.includes('territory') || h.includes('region') || h.includes('zone'));
  if ((hasBdmCode || hasTerritory) && !hasOutletCode) {
    return 'bdms';
  }

  const hasOutletName = isHeaderMatched('Outlet Name', headers) || cleanHeaders.some((h) => h.includes('name') && (h.includes('outlet') || h.includes('store') || h.includes('shop')));
  const hasTown = isHeaderMatched('Town', headers) || cleanHeaders.some((h) => h.includes('town') || h.includes('city') || h.includes('location'));
  if (hasOutletCode || hasOutletName || hasTown) {
    return 'outlets';
  }

  return null;
}

/**
 * Validate CSV string against category schema
 */
export function validateCsvContent(
  csvText: string,
  targetCategory?: CsvCategory,
  fileName = ''
): ValidationResult {
  const parsed = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false
  });

  const detectedHeaders = parsed.meta.fields || [];
  const category = targetCategory || detectCategory(detectedHeaders, fileName);

  if (!category) {
    return {
      isValid: false,
      category: null,
      detectedHeaders,
      matchedRequiredHeaders: [],
      missingRequiredHeaders: [],
      totalRows: parsed.data.length,
      validRows: 0,
      previewRows: parsed.data.slice(0, 5),
      errors: ['Unable to recognize CSV format. Please select an explicit category.'],
      warnings: []
    };
  }

  const schema = CATEGORY_SCHEMAS[category];

  const matchedRequiredHeaders: string[] = [];
  const missingRequiredHeaders: string[] = [];

  for (const req of schema.requiredHeaders) {
    const isMatched = isHeaderMatched(req, detectedHeaders);
    if (isMatched) {
      matchedRequiredHeaders.push(req);
    } else {
      missingRequiredHeaders.push(req);
    }
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (missingRequiredHeaders.length > 0) {
    errors.push(`Missing required column headers: ${missingRequiredHeaders.join(', ')}`);
  }

  if (parsed.data.length === 0) {
    errors.push('The uploaded CSV file contains no data rows.');
  }

  if (parsed.errors.length > 0) {
    warnings.push(`Parser encountered ${parsed.errors.length} formatting warnings in some lines.`);
  }

  const isValid = errors.length === 0 && parsed.data.length > 0;

  return {
    isValid,
    category,
    detectedHeaders,
    matchedRequiredHeaders,
    missingRequiredHeaders,
    totalRows: parsed.data.length,
    validRows: isValid ? parsed.data.length : 0,
    previewRows: parsed.data.slice(0, 5),
    errors,
    warnings
  };
}

/**
 * Merge or replace CSV records
 */
export function mergeCsvRecords(
  existingCsv: string | null,
  newCsv: string,
  category: CsvCategory,
  mode: 'replace' | 'merge' = 'merge'
): { mergedCsv: string; rowCount: number; addedCount: number; updatedCount: number } {
  if (mode === 'replace' || !existingCsv || !existingCsv.trim()) {
    const parsed = Papa.parse<Record<string, any>>(newCsv, { header: true, skipEmptyLines: true });
    return {
      mergedCsv: newCsv,
      rowCount: parsed.data.length,
      addedCount: parsed.data.length,
      updatedCount: 0
    };
  }

  const schema = CATEGORY_SCHEMAS[category];
  const keys = schema.primaryKey;

  const existingParsed = Papa.parse<Record<string, any>>(existingCsv, { header: true, skipEmptyLines: true });
  const newParsed = Papa.parse<Record<string, any>>(newCsv, { header: true, skipEmptyLines: true });

  const getKey = (row: Record<string, any>): string => {
    return keys.map((k) => {
      const match = Object.entries(row).find(([field]) => field.trim().toLowerCase() === k.trim().toLowerCase());
      if (match && match[1] !== undefined && match[1] !== null) {
        return String(match[1]).trim().toLowerCase();
      }
      return (row[k] || row[k.toLowerCase()] || '').toString().trim().toLowerCase();
    }).join('___');
  };

  const recordMap = new Map<string, Record<string, any>>();
  for (const row of existingParsed.data) {
    if (!row) continue;
    const k = getKey(row);
    if (k && k !== '___') recordMap.set(k, row);
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const newRow of newParsed.data) {
    if (!newRow) continue;
    const k = getKey(newRow);
    if (!k || k === '___') continue;

    if (recordMap.has(k)) {
      // Update / merge fields without wiping non-empty existing fields
      const existing = recordMap.get(k)!;
      const combined = { ...existing };
      for (const [key, val] of Object.entries(newRow)) {
        if (val !== undefined && val !== null && String(val).trim().length > 0) {
          combined[key] = val;
        }
      }
      recordMap.set(k, combined);
      updatedCount++;
    } else {
      recordMap.set(k, newRow);
      addedCount++;
    }
  }

  const mergedRows = Array.from(recordMap.values());
  const mergedCsv = Papa.unparse(mergedRows);

  return {
    mergedCsv,
    rowCount: mergedRows.length,
    addedCount,
    updatedCount
  };
}
