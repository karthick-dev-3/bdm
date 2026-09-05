/**
 * Town Name Normalizer & Canonical Territory Mapper
 * 
 * Preserves raw town inputs while dynamically mapping spelling, alias,
 * and casing discrepancies to the 12 canonical BDM territories in Tamil Nadu.
 */

export const CANONICAL_TERRITORIES = [
  'Chennai',
  'Madurai',
  'Karur',
  'Tirupur',
  'Vellore',
  'Thanjavur',
  'Dindigul',
  'Coimbatore',
  'Trichy',
  'Tirunelveli',
  'Erode',
  'Salem'
] as const;

export type CanonicalTerritory = typeof CANONICAL_TERRITORIES[number];

const TOWN_SYNONYM_MAP: Record<string, CanonicalTerritory> = {
  // Chennai
  'chennai': 'Chennai',
  'madras': 'Chennai',

  // Madurai
  'madurai': 'Madurai',
  'mdu': 'Madurai',

  // Karur
  'karur': 'Karur',

  // Tirupur
  'tirupur': 'Tirupur',
  'tiruppur': 'Tirupur',

  // Vellore
  'vellore': 'Vellore',

  // Thanjavur
  'thanjavur': 'Thanjavur',
  'tanjore': 'Thanjavur',

  // Dindigul
  'dindigul': 'Dindigul',

  // Coimbatore
  'coimbatore': 'Coimbatore',
  'cbe': 'Coimbatore',

  // Trichy
  'trichy': 'Trichy',
  'tiruchirappalli': 'Trichy',

  // Tirunelveli
  'tirunelveli': 'Tirunelveli',
  'nellai': 'Tirunelveli',

  // Erode
  'erode': 'Erode',

  // Salem
  'salem': 'Salem'
};

/**
 * Maps a raw town string into its canonical territory.
 * If unrecognized, trims and returns Title-Cased string.
 */
export function normalizeTown(rawTown: string | undefined | null): string {
  if (!rawTown) return 'Unassigned';
  const clean = rawTown.trim().toLowerCase();
  return TOWN_SYNONYM_MAP[clean] || (rawTown.charAt(0).toUpperCase() + rawTown.slice(1).toLowerCase());
}

/**
 * Checks if a raw town string was recorded non-canonically.
 */
export function isTownNonCanonical(rawTown: string | undefined | null): boolean {
  if (!rawTown) return true;
  const normalized = normalizeTown(rawTown);
  return rawTown.trim() !== normalized;
}
