import React, { useState } from 'react';
import { Search, Filter, Smartphone, User, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { Dataset } from '../../services/dataLoader';
import { EnrichedOutlet, ChecklistSubmission } from '../../types/data';
import { CounterCard } from './CounterCard';
import { CounterDossierModal } from './CounterDossierModal';
import { ChecklistModal } from './ChecklistModal';
import { AuditCounterModal } from './AuditCounterModal';

interface MobileShellProps {
  dataset: Dataset;
  initialSelectedOutletCode?: string | null;
  onVisitLogged?: (submission: ChecklistSubmission) => void;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  dataset,
  initialSelectedOutletCode,
  onVisitLogged
}) => {
  const { bdms, outlets } = dataset;

  // Selected BDM territory
  const [selectedBdmCode, setSelectedBdmCode] = useState<string>(() => {
    // If initial outlet provided, default to that BDM
    if (initialSelectedOutletCode) {
      const found = outlets.find((o) => o.code === initialSelectedOutletCode);
      if (found) return found.assignedBdmCode;
    }
    return bdms[1]?.code || bdms[0]?.code || 'BDM002'; // default Madurai (BDM002) for realistic demo
  });

  const [activeTierFilter, setActiveTierFilter] = useState<'all' | 'Revenue At Risk' | 'Payment Critical' | 'Routine Active' | 'Dormant Diagnostic'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeDossierOutlet, setActiveDossierOutlet] = useState<EnrichedOutlet | null>(() => {
    if (initialSelectedOutletCode) {
      return outlets.find((o) => o.code === initialSelectedOutletCode) || null;
    }
    return null;
  });

  const [activeChecklistOutlet, setActiveChecklistOutlet] = useState<EnrichedOutlet | null>(null);
  const [activeAuditOutlet, setActiveAuditOutlet] = useState<EnrichedOutlet | null>(null);

  // Active BDM object
  const isPrimary = selectedBdmCode === 'ALL';
  const activeBdm = isPrimary
    ? {
        code: 'ALL',
        name: 'Primary Account (Central)',
        territory: 'Tamil Nadu Network',
        phone: '',
        joinedDate: ''
      }
    : (bdms.find((b) => b.code === selectedBdmCode) || bdms[0]);

  // Filter outlets for this BDM
  const territoryOutlets = isPrimary
    ? outlets
    : outlets.filter((o) => o.assignedBdmCode === selectedBdmCode);

  const filteredOutlets = territoryOutlets.filter((o) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = `${o.name} ${o.code} ${o.ownerName} ${o.town} ${o.phone}`.toLowerCase();
      if (!match.includes(q)) return false;
    }

    if (activeTierFilter !== 'all') {
      return o.priorityTier === activeTierFilter;
    }

    return true;
  });

  // Territory Summary Counts
  const atRiskCount = territoryOutlets.filter((o) => o.priorityTier === 'Revenue At Risk').length;
  const paymentCount = territoryOutlets.filter((o) => o.priorityTier === 'Payment Critical').length;
  const activeCount = territoryOutlets.filter((o) => o.priorityTier === 'Routine Active').length;
  const dormantCount = territoryOutlets.filter((o) => o.priorityTier === 'Dormant Diagnostic').length;

  const handleStartChecklist = (outlet: EnrichedOutlet) => {
    setActiveDossierOutlet(null);
    setActiveChecklistOutlet(outlet);
  };

  const handleStartAudit = (outlet: EnrichedOutlet) => {
    setActiveDossierOutlet(null);
    setActiveAuditOutlet(outlet);
  };

  const handleChecklistSuccess = (submission: ChecklistSubmission) => {
    setActiveChecklistOutlet(null);
    if (onVisitLogged) {
      onVisitLogged(submission);
    }
  };

  return (
    <div className="flex justify-center items-start py-4 px-2 sm:px-4 min-h-[calc(100vh-120px)]">
      <div className="w-full max-w-[420px] bg-[#121115] border-4 border-slate-800 rounded-[38px] shadow-2xl overflow-hidden flex flex-col min-h-[720px] max-h-[85vh] relative">
        {/* Phone Notch */}
        <div className="w-28 h-4 bg-slate-800 mx-auto rounded-b-xl z-20 shrink-0" />

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Mobile Screen Top App Bar */}
          <div className="bg-[#1B1920] px-4 pt-3 pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Smartphone size={16} className="text-amber-400" />
                <span className="text-xs font-black tracking-tight text-white">
                  BDM FIELD COPILOT
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Online & Synced
              </span>
            </div>

            {/* BDM Selector Dropdown */}
            <div className="relative mb-2">
              <select
                className="w-full bg-slate-900 border border-white/15 text-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                value={selectedBdmCode}
                onChange={(e) => setSelectedBdmCode(e.target.value)}
              >
                {bdms.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name} — {b.territory} ({outlets.filter((o) => o.assignedBdmCode === b.code).length} counters)
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                className="w-full bg-slate-900 border border-white/15 text-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 placeholder-slate-500"
                placeholder="Search shop, code, owner, town..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Daily Beat Prioritization Tabs */}
          <div className="px-3 py-2 flex gap-1.5 overflow-x-auto bg-[#17151C] border-b border-white/5 shrink-0 custom-dropdown-menu">
            <button
              type="button"
              className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                activeTierFilter === 'all'
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
              onClick={() => setActiveTierFilter('all')}
            >
              All{territoryOutlets.length > 0 ? ` (${territoryOutlets.length})` : ''}
            </button>
            <button
              type="button"
              className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                activeTierFilter === 'Revenue At Risk'
                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
              onClick={() => setActiveTierFilter('Revenue At Risk')}
            >
              At Risk{atRiskCount > 0 ? ` (${atRiskCount})` : ''}
            </button>
            <button
              type="button"
              className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                activeTierFilter === 'Payment Critical'
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
              onClick={() => setActiveTierFilter('Payment Critical')}
            >
              Payment{paymentCount > 0 ? ` (${paymentCount})` : ''}
            </button>
            <button
              type="button"
              className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                activeTierFilter === 'Routine Active'
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
              onClick={() => setActiveTierFilter('Routine Active')}
            >
              Active{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
          </div>

          {/* Territory Counter Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-dropdown-menu">
            {filteredOutlets.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-500 text-xs">
                No retail outlets match the filter criteria.
              </div>
            ) : (
              filteredOutlets.map((outlet) => (
                <CounterCard
                  key={outlet.code}
                  outlet={outlet}
                  onSelect={(o) => setActiveDossierOutlet(o)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dossier Modal */}
      {activeDossierOutlet && (
        <CounterDossierModal
          outlet={activeDossierOutlet}
          onClose={() => setActiveDossierOutlet(null)}
          onStartChecklist={handleStartChecklist}
          onStartAudit={handleStartAudit}
        />
      )}

      {/* 5-Point Checklist Modal */}
      {activeChecklistOutlet && (
        <ChecklistModal
          outlet={activeChecklistOutlet}
          onClose={() => setActiveChecklistOutlet(null)}
          onSuccess={handleChecklistSuccess}
        />
      )}

      {/* Ground Truth Audit Modal */}
      {activeAuditOutlet && (
        <AuditCounterModal
          outlet={activeAuditOutlet}
          onClose={() => setActiveAuditOutlet(null)}
          onSuccess={() => setActiveAuditOutlet(null)}
        />
      )}
    </div>
  );
};
