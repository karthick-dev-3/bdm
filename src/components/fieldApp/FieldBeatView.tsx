import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Clock } from 'lucide-react';
import { EnrichedOutlet, ChecklistSubmission } from '../../types/data';
import { CounterDetailDrawer } from './CounterDetailDrawer';
import { formatINR } from '../../utils/formatters';
import { Pagination } from '../common/Pagination';

interface FieldBeatViewProps {
  outlets: EnrichedOutlet[];
  selectedBdmCode: string;
  onVisitLogged: (submission: ChecklistSubmission) => void;
}

export const FieldBeatView: React.FC<FieldBeatViewProps> = ({
  outlets,
  selectedBdmCode,
  onVisitLogged
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'Revenue At Risk' | 'Payment Critical' | 'Routine Active' | 'Dormant Diagnostic'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState<EnrichedOutlet | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery, selectedBdmCode]);

  // Filter outlets for current territory
  const territoryOutlets = selectedBdmCode === 'ALL'
    ? outlets
    : outlets.filter((o) => o.assignedBdmCode === selectedBdmCode);

  const filteredOutlets = territoryOutlets.filter((o) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = `${o.name} ${o.code} ${o.ownerName} ${o.town} ${o.phone}`.toLowerCase();
      if (!match.includes(q)) return false;
    }

    if (activeFilter !== 'all') {
      return o.priorityTier === activeFilter;
    }

    return true;
  });

  const pagedOutlets = filteredOutlets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const atRiskCount = territoryOutlets.filter((o) => o.priorityTier === 'Revenue At Risk').length;
  const paymentCount = territoryOutlets.filter((o) => o.priorityTier === 'Payment Critical').length;
  const activeCount = territoryOutlets.filter((o) => o.priorityTier === 'Routine Active').length;
  const dormantCount = territoryOutlets.filter((o) => o.priorityTier === 'Dormant Diagnostic').length;

  const getStatusConfig = (st: string) => {
    switch (st) {
      case 'Active': return { color: 'var(--color-success)', label: 'Active' };
      case 'At-Risk': return { color: 'var(--color-warning)', label: 'At-Risk' };
      case 'Dormant': return { color: 'var(--color-error)', label: 'Dormant' };
      default: return { color: 'var(--color-text-muted)', label: 'Ghost' };
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Filter Bar with Clean Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200/70 gap-1 shadow-xs flex-wrap">
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-[#E68A00] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveFilter('all')}
          >
            <span>All Counters</span>
            {territoryOutlets.length > 0 && (
              <span className={`text-[0.7rem] font-mono ${activeFilter === 'all' ? 'text-white/80' : 'text-slate-400'}`}>
                ({territoryOutlets.length})
              </span>
            )}
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              activeFilter === 'Revenue At Risk'
                ? 'bg-[#E68A00] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveFilter('Revenue At Risk')}
          >
            <span>Revenue At Risk</span>
            {atRiskCount > 0 && (
              <span className={`text-[0.7rem] font-mono ${activeFilter === 'Revenue At Risk' ? 'text-white/80' : 'text-slate-400'}`}>
                ({atRiskCount})
              </span>
            )}
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              activeFilter === 'Payment Critical'
                ? 'bg-[#E68A00] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveFilter('Payment Critical')}
          >
            <span>Payment Due</span>
            {paymentCount > 0 && (
              <span className={`text-[0.7rem] font-mono ${activeFilter === 'Payment Critical' ? 'text-white/80' : 'text-slate-400'}`}>
                ({paymentCount})
              </span>
            )}
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              activeFilter === 'Routine Active'
                ? 'bg-[#E68A00] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveFilter('Routine Active')}
          >
            <span>Active Billers</span>
            {activeCount > 0 && (
              <span className={`text-[0.7rem] font-mono ${activeFilter === 'Routine Active' ? 'text-white/80' : 'text-slate-400'}`}>
                ({activeCount})
              </span>
            )}
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              activeFilter === 'Dormant Diagnostic'
                ? 'bg-[#E68A00] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveFilter('Dormant Diagnostic')}
          >
            <span>Dormant</span>
            {dormantCount > 0 && (
              <span className={`text-[0.7rem] font-mono ${activeFilter === 'Dormant Diagnostic' ? 'text-white/80' : 'text-slate-400'}`}>
                ({dormantCount})
              </span>
            )}
          </button>
        </div>

        <div className="relative min-w-[280px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search shop, code, owner, town..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[38px] pl-9 pr-4 rounded-full bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E68A00] transition-colors shadow-xs"
          />
        </div>
      </div>

      {/* Outlets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pagedOutlets.map((outlet) => {
          const b = outlet.billing;
          const months = [b.feb26Val, b.mar26Val, b.apr26Val, b.may26Val, b.jun26Val, b.jul26Val];
          const statusCfg = getStatusConfig(outlet.commercialStatus);

          return (
            <div
              key={outlet.code}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col gap-3.5 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-[#E68A00] ${
                selectedOutlet?.code === outlet.code ? 'border-[#E68A00] bg-amber-500/[0.03]' : 'border-slate-200/80'
              }`}
              onClick={() => setSelectedOutlet(outlet)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 truncate">{outlet.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                    <span className="font-semibold text-slate-700">{outlet.code}</span>
                    <span>•</span>
                    <span>{outlet.type}</span>
                    <span>•</span>
                    <span>{outlet.normalizedTown}</span>
                  </div>
                </div>

                {/* Clean Status: dot + text, NO pill background */}
                <div className="inline-flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.color }} />
                  <span className="font-semibold text-xs" style={{ color: statusCfg.color }}>
                    {statusCfg.label}
                  </span>
                </div>
              </div>

              {/* Priority & Terms row */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div>
                  <span>Credit: </span>
                  <strong className={outlet.creditDays >= 30 ? 'text-amber-600 font-bold' : 'text-slate-800 font-semibold'}>
                    {outlet.creditDaysRaw || 'COD'}
                  </strong>
                </div>

                {outlet.priorityTier === 'Revenue At Risk' && (
                  <span className="text-purple-600 font-semibold flex items-center gap-1">
                    <AlertCircle size={13} /> Revenue At Risk
                  </span>
                )}
                {outlet.priorityTier === 'Payment Critical' && (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <Clock size={13} /> Payment First
                  </span>
                )}
              </div>

              {/* Metrics Bottom Row */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-slate-400 text-[0.72rem]">July Invoiced:</span>
                  <strong className={`font-mono ${b.jul26Val > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {formatINR(b.jul26Val)}
                  </strong>
                  {b.jul26Units > 0 && (
                    <span className="text-[0.7rem] text-slate-400">({b.jul26Units}u)</span>
                  )}
                </div>

                {/* 6 Dots for Feb to Jul */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[0.7rem]">6M:</span>
                  <div className="flex items-center gap-1">
                    {months.map((val, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-xs ${
                          val > 0
                            ? idx === 5
                              ? 'bg-[#E68A00]'
                              : 'bg-teal-500'
                            : 'bg-slate-200'
                        }`}
                        title={`Month ${idx + 2}: ₹${val.toLocaleString('en-IN')}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredOutlets.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredOutlets.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="counters"
          />
        </div>
      )}

      {filteredOutlets.length === 0 && (
        <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
          No retail counters match this filter criteria.
        </div>
      )}

      {/* Drawer */}
      <CounterDetailDrawer
        outlet={selectedOutlet}
        onClose={() => setSelectedOutlet(null)}
        onVisitLogged={onVisitLogged}
      />
    </div>
  );
};
