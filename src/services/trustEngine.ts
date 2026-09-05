import { VisitLog } from '../types/data';

/**
 * Visit Trust & Integrity Engine
 * 
 * Computes a data-backed trust score (0 - 100) for every visit log
 * without altering or erasing the historical records.
 */

const TEMPLATE_REMARKS = new Set([
  'discussed scheme',
  'will order next week',
  'shop closed',
  'owner not available',
  'asked for better margin',
  'stock displayed',
  'collection pending',
  'display not as per norms'
]);

export interface TrustEvaluation {
  score: number;
  flags: string[];
  isDriveBy: boolean;
}

export function evaluateVisitTrust(
  rawDuration: number | undefined | null,
  rawRemarks: string | undefined | null,
  purpose: string | undefined | null,
  outletEverBilled: boolean,
  outletActiveJuly: boolean
): TrustEvaluation {
  let score = 100;
  const flags: string[] = [];

  // 1. Duration check
  if (rawDuration === undefined || rawDuration === null || isNaN(rawDuration)) {
    score -= 25;
    flags.push('Missing Duration');
  } else if (rawDuration <= 5) {
    // If shop was closed, 5 mins is plausible; if routine visit/stock check, 5 mins is a drive-by
    const isClosedRemark = rawRemarks?.toLowerCase().includes('closed');
    if (!isClosedRemark) {
      score -= 30;
      flags.push('Drive-by Visit (≤5 mins)');
    } else {
      score -= 10;
      flags.push('Brief Check (Closed)');
    }
  }

  // 2. Remarks check
  if (!rawRemarks || rawRemarks.trim().length === 0) {
    score -= 30;
    flags.push('Blank Remarks');
  } else {
    const cleanRemark = rawRemarks.trim().toLowerCase();
    if (TEMPLATE_REMARKS.has(cleanRemark)) {
      score -= 15;
      flags.push('Repetitive Template Remark');
    }
  }

  // 3. Purpose completeness
  if (!purpose || purpose.trim().length === 0) {
    score -= 10;
    flags.push('Unspecified Purpose');
  }

  // 4. Commercial correlation (visiting a counter that never billed)
  if (!outletEverBilled) {
    score -= 15;
    flags.push('Zero-Billing Sinkhole');
  }

  // Cap score between 10 and 100
  const finalScore = Math.max(10, Math.min(100, score));
  const isDriveBy = (rawDuration !== undefined && rawDuration !== null && rawDuration <= 5 && !rawRemarks?.toLowerCase().includes('closed'));

  return {
    score: finalScore,
    flags,
    isDriveBy
  };
}

/**
 * Identifies wall-sharing or identical-coordinate clusters
 */
export function findCoordinateClusters(outlets: { code: string; name: string; lat?: number; lng?: number; town: string }[]) {
  const coordMap = new Map<string, typeof outlets>();

  for (const outlet of outlets) {
    if (outlet.lat && outlet.lng) {
      // Precision to ~11 meters
      const key = `${outlet.lat.toFixed(4)},${outlet.lng.toFixed(4)}`;
      if (!coordMap.has(key)) {
        coordMap.set(key, []);
      }
      coordMap.get(key)!.push(outlet);
    }
  }

  // Filter only clusters with > 1 outlet
  const clusters: { coordKey: string; outlets: typeof outlets }[] = [];
  for (const [coordKey, clusterOutlets] of coordMap.entries()) {
    if (clusterOutlets.length > 1) {
      clusters.push({ coordKey, outlets: clusterOutlets });
    }
  }

  return clusters;
}
