import { ChecklistSubmission } from '../types/data';
import { getSavedVisits } from './auditStore';

export type SyncState = 'synced' | 'syncing' | 'offline_queued' | 'error';

export interface SyncStatusInfo {
  state: SyncState;
  pendingCount: number;
  lastSyncedTimestamp: number | null;
  errorMessage?: string;
}

export interface MergeRecord {
  primaryCode: string;
  secondaryCode: string;
  timestamp: string;
  mergedBy?: string;
}

const STORAGE_KEY_LAST_SYNCED_TIMESTAMP = 'bdm_copilot_last_synced_ts_v1';
const STORAGE_KEY_SYNCED_IDS = 'bdm_copilot_synced_visit_ids_v1';
const STORAGE_KEY_LOCAL_MERGES = 'bdm_copilot_merged_outlets_v1';

let currentSyncStatus: SyncStatusInfo = {
  state: navigator.onLine ? 'synced' : 'offline_queued',
  pendingCount: 0,
  lastSyncedTimestamp: null
};

const listeners = new Set<(status: SyncStatusInfo) => void>();

function getSyncedVisitKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SYNCED_IDS);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function saveSyncedVisitKeys(keys: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY_SYNCED_IDS, JSON.stringify(Array.from(keys)));
  } catch (e) {
    console.error('Failed to save synced keys', e);
  }
}

export function subscribeSyncStatus(listener: (status: SyncStatusInfo) => void): () => void {
  listeners.add(listener);
  listener(currentSyncStatus);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  listeners.forEach((l) => l({ ...currentSyncStatus }));
}

function getVisitKey(v: ChecklistSubmission): string {
  return `${v.outletCode}_${v.checkInTimestamp || v.visitDate}`;
}

export function getPendingUnsyncedVisits(): ChecklistSubmission[] {
  const allVisits = getSavedVisits();
  const syncedKeys = getSyncedVisitKeys();
  return allVisits.filter((v) => !syncedKeys.has(getVisitKey(v)));
}

export async function syncPendingVisitsToBackend(): Promise<boolean> {
  if (!navigator.onLine) {
    currentSyncStatus = {
      state: 'offline_queued',
      pendingCount: getPendingUnsyncedVisits().length,
      lastSyncedTimestamp: currentSyncStatus.lastSyncedTimestamp
    };
    notifyListeners();
    return false;
  }

  const pending = getPendingUnsyncedVisits();
  if (pending.length === 0) {
    currentSyncStatus = {
      state: 'synced',
      pendingCount: 0,
      lastSyncedTimestamp: currentSyncStatus.lastSyncedTimestamp || Date.now()
    };
    notifyListeners();
    return true;
  }

  currentSyncStatus = {
    state: 'syncing',
    pendingCount: pending.length,
    lastSyncedTimestamp: currentSyncStatus.lastSyncedTimestamp
  };
  notifyListeners();

  try {
    const response = await fetch('/api/sync/visits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ visits: pending })
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    // Mark as synced
    const syncedKeys = getSyncedVisitKeys();
    pending.forEach((v) => syncedKeys.add(getVisitKey(v)));
    saveSyncedVisitKeys(syncedKeys);

    const now = Date.now();
    localStorage.setItem(STORAGE_KEY_LAST_SYNCED_TIMESTAMP, now.toString());

    currentSyncStatus = {
      state: 'synced',
      pendingCount: 0,
      lastSyncedTimestamp: now
    };
    notifyListeners();
    return true;
  } catch (error: any) {
    console.warn('Background sync failed, staying in offline queue:', error.message);
    currentSyncStatus = {
      state: 'error',
      pendingCount: pending.length,
      lastSyncedTimestamp: currentSyncStatus.lastSyncedTimestamp,
      errorMessage: error.message || 'Connection failed'
    };
    notifyListeners();
    return false;
  }
}

// ----------------------------------------------------------------------
// Master Duplicate Merging REST Operations
// ----------------------------------------------------------------------

export function getLocalMergedOutlets(): MergeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_MERGES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalMergedOutlets(merges: MergeRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_MERGES, JSON.stringify(merges));
  } catch (e) {
    console.error('Failed to save merges locally', e);
  }
}

export async function mergeDuplicateOutletsBackend(
  primaryCode: string,
  secondaryCode: string,
  mergedBy = 'Territory Manager'
): Promise<MergeRecord[]> {
  const local = getLocalMergedOutlets().filter((m) => m.secondaryCode !== secondaryCode && m.secondaryCode !== primaryCode);
  const newMerge: MergeRecord = {
    primaryCode,
    secondaryCode,
    timestamp: new Date().toISOString(),
    mergedBy
  };
  local.push(newMerge);
  saveLocalMergedOutlets(local);

  // Attempt sync to embedded backend
  try {
    await fetch('/api/outlets/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMerge)
    });
  } catch (e) {
    console.warn('Backend merge sync skipped (operating in client storage mode)');
  }

  return local;
}

export async function unmergeDuplicateOutletBackend(secondaryCode: string): Promise<MergeRecord[]> {
  const local = getLocalMergedOutlets().filter((m) => m.secondaryCode !== secondaryCode);
  saveLocalMergedOutlets(local);

  try {
    await fetch('/api/outlets/unmerge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secondaryCode })
    });
  } catch (e) {
    console.warn('Backend unmerge sync skipped');
  }

  return local;
}

// ----------------------------------------------------------------------
// Setup Auto-Sync Listeners on Window Online & Interval
// ----------------------------------------------------------------------

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingVisitsToBackend();
  });

  window.addEventListener('offline', () => {
    currentSyncStatus = {
      state: 'offline_queued',
      pendingCount: getPendingUnsyncedVisits().length,
      lastSyncedTimestamp: currentSyncStatus.lastSyncedTimestamp
    };
    notifyListeners();
  });

  // Background heartbeat sync every 30 seconds
  setInterval(() => {
    if (navigator.onLine && getPendingUnsyncedVisits().length > 0) {
      syncPendingVisitsToBackend();
    }
  }, 30000);
}
