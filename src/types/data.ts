/**
 * Core Data Models & TypeScript Definitions
 * Designed for Mobile Distribution Network in Tamil Nadu
 */

export type OutletType = 'Multi-Yard' | 'Premium Reseller' | 'General Trade' | 'Mobile Specialist';

export type CommercialStatus = 'Active' | 'At-Risk' | 'Dormant' | 'Ghost';

export interface BDM {
  code: string;           // e.g. BDM001
  name: string;           // e.g. Sundar R
  territory: string;      // e.g. Chennai
  phone: string;
  joinedDate: string;
}

export interface RawOutlet {
  code: string;           // OA0001
  name: string;           // Bharath Traders
  type: OutletType;
  town: string;           // In raw form (e.g. Madras, Cbe, Nellai)
  normalizedTown: string; // Canonical form (e.g. Chennai, Coimbatore, Tirunelveli)
  ownerName: string;
  phone: string;
  onboardedDate: string;
  creditDaysRaw: string;  // "COD", "15", "30 days", "0", ""
  creditDays: number;     // parsed days (0 for COD)
  creditDaysUnknown?: boolean; // true if raw credit field was blank or unparseable
  latitude?: number;
  longitude?: number;
  rawStatus: string;      // "Active", "ACTIVE", "dormant", "Hold", etc.
}

export interface OutletBillingSummary {
  feb26Units: number;
  feb26Val: number;
  mar26Units: number;
  mar26Val: number;
  apr26Units: number;
  apr26Val: number;
  may26Units: number;
  may26Val: number;
  jun26Units: number;
  jun26Val: number;
  jul26Units: number;
  jul26Val: number;
  totalUnits6M: number;
  totalValue6M: number;
  lastBilledMonth: string | null; // e.g. "2026-07" or null
  activeInJuly: boolean;
  peakMonthVal: number;
  peakMonthName?: string;
  isFading: boolean; // Billed well early, but dropped in June/July
}

export interface EnrichedOutlet extends RawOutlet {
  assignedBdmCode: string;
  assignedBdmName: string;
  commercialStatus: CommercialStatus;
  billing: OutletBillingSummary;
  totalVisitsLogged: number;
  lastVisitDate?: string;
  lastVisitRemarks?: string;
  isDuplicateSuspect: boolean;
  duplicateGroupKey?: string;
  isMergedAlias?: boolean;
  mergedIntoCode?: string;
  hasMissingCoords: boolean;
  priorityTier: 'Revenue At Risk' | 'Payment Critical' | 'Routine Active' | 'Dormant Diagnostic';
  priorityScore: number;
}

export interface VisitLog {
  visitId: string;
  bdmCode: string;
  bdmName: string;
  outletCode: string;
  outletName: string;
  visitDate: string;
  checkInTime: string;
  durationMins?: number;
  purpose: string;
  remarks: string;
  // Trust Engine calculations
  trustScore: number;         // 0 - 100
  trustFlags: string[];       // e.g. "Missing Duration", "Zero Billing Sinkhole", "Clustered Repeat Remark"
  isDriveBy: boolean;         // Duration <= 5 mins without concrete output
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'Commercial' | 'Inventory' | 'Branding' | 'Market' | 'Commitment';
}

export interface ChecklistSubmission {
  outletCode: string;
  bdmCode: string;
  visitDate: string;
  checkInTimestamp: number;
  durationMins: number;
  answers: { [itemId: string]: { status: 'passed' | 'issue' | 'na'; notes?: string } };
  counterCondition: 'open' | 'closed' | 'shut_down' | 'disputed';
  quietReason?: 'closed' | 'parallel_distributor' | 'credit_dispute' | 'low_demand' | 'never_traded';
  orderBooked?: {
    units: number;
    estimatedValue: number;
    deliveryDate: string;
    paymentCommitment: string;
  };
  fieldNotes: string;
  verifiedCounterPhotoPromptDone: boolean;
  photoVerified?: boolean;
  photoUrl?: string;
}
