/**
 * SQLite Database Storage Client for BDM Copilot
 * Persists uploaded datasets, metadata, and tables directly to the backend SQLite DB (data/bdm_sales.db)
 */

export type CsvCategory = 'bdms' | 'outlets' | 'billing-monthly' | 'visit-log';

export interface CsvFileMetadata {
  id: string;
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
 * Retrieve combined saved CSV text for a category from SQLite
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
 * Retrieve a specific single CSV file by its ID
 */
export async function getFileCsv(id: string): Promise<{ fileName: string; csvContent: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/db/file/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.file ? { fileName: data.file.fileName, csvContent: data.file.csvContent } : null;
  } catch (err) {
    console.warn(`[SQLite] Error fetching file ${id}`, err);
    return null;
  }
}

/**
 * Get all stored file metadata grouped by category from SQLite
 */
export async function getAllMetadata(): Promise<Record<CsvCategory, CsvFileMetadata[]>> {
  try {
    const res = await fetch(`${API_BASE}/db/metadata`);
    if (!res.ok) {
      return { bdms: [], outlets: [], 'billing-monthly': [], 'visit-log': [] };
    }
    const data = await res.json();
    const raw = data.metadata || {};
    const formatted: Record<CsvCategory, CsvFileMetadata[]> = {
      bdms: Array.isArray(raw.bdms) ? raw.bdms : (raw.bdms ? [raw.bdms] : []),
      outlets: Array.isArray(raw.outlets) ? raw.outlets : (raw.outlets ? [raw.outlets] : []),
      'billing-monthly': Array.isArray(raw['billing-monthly']) ? raw['billing-monthly'] : (raw['billing-monthly'] ? [raw['billing-monthly']] : []),
      'visit-log': Array.isArray(raw['visit-log']) ? raw['visit-log'] : (raw['visit-log'] ? [raw['visit-log']] : [])
    };
    return formatted;
  } catch (err) {
    console.warn('[SQLite] Error fetching DB metadata', err);
    return { bdms: [], outlets: [], 'billing-monthly': [], 'visit-log': [] };
  }
}

/**
 * Delete a specific custom CSV file by ID in SQLite
 */
export async function deleteFileCsv(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/db/file/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error(`Failed to delete file ${id} in SQLite database`);
  }
}

/**
 * Delete all custom CSVs for a category in SQLite (reverts to baseline CSV)
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
