import { OutletBillingSummary, EnrichedOutlet } from '../types/data';
import { formatINR } from '../utils/formatters';

/**
 * Beat Prioritization Engine
 * 
 * Determines which counters a BDM should prioritize on their daily beat:
 * 1. Revenue At Risk (Fading high-value counters)
 * 2. Payment Critical (Credit exposure)
 * 3. Routine Active (Healthy regular billers)
 * 4. Dormant Diagnostic (Quiet counters needing physical audit)
 */

export interface PriorityEvaluation {
  tier: 'Revenue At Risk' | 'Payment Critical' | 'Routine Active' | 'Dormant Diagnostic';
  score: number;
  reason: string;
}

export function evaluateOutletPriority(
  billing: OutletBillingSummary,
  creditDays: number,
  type: string
): PriorityEvaluation {
  const peak = billing.peakMonthVal;
  const julVal = billing.jul26Val;
  const junVal = billing.jun26Val;
  const recentVal = julVal + junVal;

  // Case 1: Revenue At Risk
  // High historic biller (peak >= 5L) that stopped or plunged in recent months
  if (peak >= 500000 && recentVal < peak * 0.35) {
    return {
      tier: 'Revenue At Risk',
      score: 95,
      reason: `Historical peak of ${formatINR(peak)} plunged in recent months. Immediate account revival required.`
    };
  }

  // Moderate historic biller (peak >= 2L) that stopped in July
  if (peak >= 200000 && julVal === 0 && billing.feb26Val + billing.mar26Val > 0) {
    return {
      tier: 'Revenue At Risk',
      score: 88,
      reason: `Account went silent in July after consistent billing earlier this year. Urgent owner contact needed.`
    };
  }

  // Case 2: Payment Critical
  // Active biller with high credit exposure (30 or 45 days)
  if (recentVal > 0 && creditDays >= 30) {
    return {
      tier: 'Payment Critical',
      score: 80,
      reason: `${creditDays}-day credit terms with recent shipments of ${formatINR(recentVal)}. Reconcile ledger before next booking.`
    };
  }

  // Case 3: Routine Active
  // Currently billing healthy accounts
  if (billing.activeInJuly) {
    const isAnchor = type === 'Multi-Yard' || type === 'Premium Reseller';
    return {
      tier: 'Routine Active',
      score: isAnchor ? 72 : 62,
      reason: `Consistent July billing (${formatINR(julVal)}). Scheduled stock depth review and indent booking.`
    };
  }

  // Case 4: Dormant Diagnostic
  // Ghost counters or accounts dormant for > 60 days
  const isGhost = billing.totalValue6M === 0;
  return {
    tier: 'Dormant Diagnostic',
    score: isGhost ? 30 : 45,
    reason: isGhost 
      ? 'Zero billing on record for 6 months. Physical audit needed: verify if shop exists, closed, or switched.'
      : 'Inactive for over 60 days. Determine root cause (dispute, parallel distributor, or shutdown).'
  };
}
