import { ChecklistSubmission } from '../types/data';
import Papa from 'papaparse';

const STORAGE_KEY_VISITS = 'bdm_copilot_new_visits_v1';
const STORAGE_KEY_AUDITS = 'bdm_copilot_counter_audits_v1';

export interface CounterAudit {
  outletCode: string;
  bdmCode: string;
  timestamp: string;
  operationalStatus: 'Open & Trading' | 'Temporarily Shut' | 'Permanently Closed' | 'Duplicate / Shifted';
  notes: string;
}

export function getSavedVisits(): ChecklistSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISITS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function getLatestVisitForOutlet(outletCode: string): ChecklistSubmission | null {
  if (!outletCode) return null;
  const visits = getSavedVisits();
  return visits.find((v) => v.outletCode === outletCode) || null;
}

export function saveNewVisit(visit: ChecklistSubmission): void {
  try {
    const existing = getSavedVisits();
    // Keep newest visit for this outlet at the very top
    const filtered = existing.filter((v) => v.outletCode !== visit.outletCode);
    filtered.unshift(visit);
    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(filtered));

    // Direct sync to SQLite database
    fetch('/api/sync/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visits: [visit] })
    }).catch((err) => console.warn('[SQLite] Visits sync background note:', err.message));
  } catch (e) {
    console.error('Failed to persist visit locally', e);
  }
}

export function getSavedAudits(): CounterAudit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDITS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveCounterAudit(audit: CounterAudit): void {
  try {
    const existing = getSavedAudits();
    existing.unshift(audit);
    localStorage.setItem(STORAGE_KEY_AUDITS, JSON.stringify(existing));

    // Direct sync to SQLite database
    fetch('/api/sync/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audits: [audit] })
    }).catch((err) => console.warn('[SQLite] Audits sync background note:', err.message));
  } catch (e) {
    console.error('Failed to persist audit locally', e);
  }
}

export function exportVisitsAsCsv(): void {
  const visits = getSavedVisits();
  if (visits.length === 0) {
    alert('No field visit logs currently stored in local persistence.');
    return;
  }

  const flattenedRows = visits.map((v) => ({
    outlet_code: v.outletCode,
    bdm_code: v.bdmCode,
    visit_date: v.visitDate,
    checkin_time: new Date(v.checkInTimestamp).toLocaleTimeString(),
    duration_mins: v.durationMins,
    counter_condition: v.counterCondition,
    quiet_reason: v.quietReason || '',
    booked_units: v.orderBooked?.units || 0,
    booked_value_inr: v.orderBooked?.estimatedValue || 0,
    delivery_date: v.orderBooked?.deliveryDate || '',
    payment_commitment: v.orderBooked?.paymentCommitment || '',
    photo_verified: v.photoVerified ? 'YES' : 'NO',
    field_notes: v.fieldNotes,
    checklist_answers_summary: Object.entries(v.answers || {})
      .map(([k, ans]) => `${k}:${ans.status}`)
      .join('; ')
  }));

  const csv = Papa.unparse(flattenedRows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `bdm_field_visits_log_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportAuditsAsCsv(): void {
  const audits = getSavedAudits();
  if (audits.length === 0) {
    alert('No counter ground truth audits currently stored in local persistence.');
    return;
  }

  const csv = Papa.unparse(audits);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `bdm_counter_audits_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
