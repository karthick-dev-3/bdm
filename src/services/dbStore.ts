/**
 * SQLite Database Storage Client for BDM Copilot
 * Persists uploaded datasets, metadata, and tables directly to the backend SQLite DB (data/bdm_sales.db)
 */

export type CsvCategory = 'bdms' | 'outlets' | 'billing-monthly' | 'visit-log';

export interface CsvFileMetadata {
  category: CsvCategory;
  fileName: string;
  fileSize: number;
  rowCount: number;
  uploadedAt: string;
  isCustom: boolean;
  version: number;
}

const API_BASE = '/api';

/**
 * Save custom CSV text for a category with metadata to SQLite
 */
export async function saveCategoryCsv(
  category: CsvCategory,
  csvContent: string,
  fileName: string,
  rowCount: number
): Promise<CsvFileMetadata> {
  const res = await fetch(`${API_BASE}/db/category/${category}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvContent, fileName, rowCount })
  });

  if (!res.ok) {
    throw new Error(`Failed to save ${category} to SQLite database`);
  }

  const data = await res.json();
  return data.metadata;
}

/**
 * Retrieve saved CSV text for a category from SQLite
 */
export async function getCategoryCsv(category: CsvCategory): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/db/category/${category}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.csvContent || null;
  } catch (err) {
    console.warn(`[SQLite] Error fetching CSV for category ${category}`, err);
    return null;
  }
}

/**
 * Get all stored file metadata from SQLite
 */
export async function getAllMetadata(): Promise<Record<CsvCategory, CsvFileMetadata | null>> {
  try {
    const res = await fetch(`${API_BASE}/db/metadata`);
    if (!res.ok) {
      return { bdms: null, outlets: null, 'billing-monthly': null, 'visit-log': null };
    }
    const data = await res.json();
    return data.metadata;
  } catch (err) {
    console.warn('[SQLite] Error fetching DB metadata', err);
    return { bdms: null, outlets: null, 'billing-monthly': null, 'visit-log': null };
  }
}

/**
 * Delete custom CSV for a category in SQLite (reverts to baseline CSV)
 */
export async function deleteCategoryCsv(category: CsvCategory): Promise<void> {
  const res = await fetch(`${API_BASE}/db/category/${category}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error(`Failed to delete ${category} in SQLite database`);
  }
}

/**
 * Reset all SQLite tables to factory defaults
 */
export async function resetAllToDefault(): Promise<void> {
  const res = await fetch(`${API_BASE}/db/reset`, {
    method: 'POST'
  });
  if (!res.ok) {
    throw new Error('Failed to reset SQLite database');
  }
}
