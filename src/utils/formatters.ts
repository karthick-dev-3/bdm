/**
 * Standard Indian Currency & Number Formatters
 * Formats values correctly according to Indian financial conventions (Lakhs & Crores).
 */

/**
 * Formats number into Indian Rupee string:
 * - >= 1 Crore (10,000,000) -> ₹X.XX Cr
 * - >= 1 Lakh (100,000) -> ₹X.XX L
 * - < 1 Lakh -> ₹XX,XXX (e.g. ₹62,000, ₹79,000)
 */
export function formatINR(val: number | undefined | null, compact = false): string {
  if (val === undefined || val === null || isNaN(val) || val === 0) {
    return '₹0';
  }

  const absVal = Math.abs(val);

  if (absVal >= 10000000) {
    const cr = val / 10000000;
    return `₹${cr.toFixed(2)} Cr`;
  }

  if (absVal >= 100000) {
    const lakh = val / 100000;
    return `₹${lakh.toFixed(2)} L`;
  }

  if (compact && absVal >= 1000) {
    const k = val / 1000;
    return `₹${k.toFixed(0)}k`;
  }

  return `₹${val.toLocaleString('en-IN')}`;
}

/**
 * Formats a monthly bar figure cleanly for compact UI grids:
 * E.g. ₹62,000 -> ₹62k, ₹1,29,000 -> ₹1.29L, ₹0 -> ₹0
 */
export function formatMonthlyBarValue(val: number | undefined | null): string {
  if (!val || val === 0) return '₹0';
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(1)}L`;
  }
  return `₹${Math.round(val / 1000)}k`;
}

/**
 * Formats number into comma-separated Indian string
 */
export function formatNumberIN(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
}
