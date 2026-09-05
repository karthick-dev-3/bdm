import React, { useState } from 'react';
import { X, GitMerge, CheckCircle2, ArrowRight, ShieldCheck, MapPin, Phone, User, Calendar, CreditCard, DollarSign, Layers } from 'lucide-react';
import { EnrichedOutlet } from '../../types/data';
import { formatINR, formatNumberIN } from '../../utils/formatters';

interface MergeTwinModalProps {
  outlets: EnrichedOutlet[];
  onClose: () => void;
  onConfirmMerge: (primaryCode: string, secondaryCode: string) => void;
}

export const MergeTwinModal: React.FC<MergeTwinModalProps> = ({
  outlets,
  onClose,
  onConfirmMerge
}) => {
  if (!outlets || outlets.length < 2) return null;

  const [primaryCode, setPrimaryCode] = useState<string>(outlets[0].code);
  const secondaryCode = outlets.find((o) => o.code !== primaryCode)?.code || outlets[1].code;

  const primaryOutlet = outlets.find((o) => o.code === primaryCode) || outlets[0];
  const secondaryOutlet = outlets.find((o) => o.code === secondaryCode) || outlets[1];

  // Consolidated billing preview
  const combinedTotalVal = primaryOutlet.billing.totalValue6M + secondaryOutlet.billing.totalValue6M;
  const combinedTotalUnits = primaryOutlet.billing.totalUnits6M + secondaryOutlet.billing.totalUnits6M;
  const combinedJulVal = primaryOutlet.billing.jul26Val + secondaryOutlet.billing.jul26Val;
  const combinedVisits = primaryOutlet.totalVisitsLogged + secondaryOutlet.totalVisitsLogged;

  const handleMerge = () => {
    onConfirmMerge(primaryCode, secondaryCode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1B1920] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <GitMerge size={18} />
            </div>
            <div>
              <div className="text-base font-bold text-white">
                Merge Twin Master Registrations
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Consolidate duplicate outlet records into a single canonical master account
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-dropdown-menu">
          {/* Explanation Banner */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-slate-300 space-y-1">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Master Data Harmonization
            </div>
            <p className="leading-relaxed text-slate-300">
              Merging combines historical 6-month billing (Feb–Jul 2026) and linked field visits into your selected canonical record, removing duplicate registration inflation from network KPIs.
            </p>
          </div>

          {/* Side-by-Side Candidates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[primaryOutlet, secondaryOutlet].map((outlet) => {
              const isPrimary = outlet.code === primaryCode;
              return (
                <div
                  key={outlet.code}
                  onClick={() => setPrimaryCode(outlet.code)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    isPrimary
                      ? 'border-emerald-500/80 bg-emerald-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPrimary
                          ? 'bg-emerald-500 text-black font-extrabold'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {isPrimary ? 'KEEP AS CANONICAL' : 'MERGE AS ALIAS'}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {outlet.code}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white mb-0.5">
                    {outlet.name || '[Unnamed Outlet]'}
                  </div>
                  <div className="text-xs text-slate-400 mb-3">
                    {outlet.type} • {outlet.normalizedTown}
                  </div>

                  <div className="space-y-1 text-xs border-t border-white/10 pt-2.5 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-slate-500" /> Owner: <strong className="text-white font-medium">{outlet.ownerName || 'Missing'}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-500" /> Phone: <strong className="text-white font-medium">{outlet.phone || 'Missing'}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard size={12} className="text-slate-500" /> Credit: <strong className="text-white font-medium">{outlet.creditDaysRaw || 'COD'}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={12} className="text-slate-500" /> 6M Invoiced: <strong className="text-emerald-400 font-bold">{formatINR(outlet.billing.totalValue6M)} ({outlet.billing.totalUnits6M}u)</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Consolidated Preview Strip */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-2">
            <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Layers size={14} /> Resulting Canonical Account Summary ({primaryOutlet.code})
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white/5 p-2 rounded-lg">
                <div className="text-[10px] text-slate-400">Combined 6M Rev</div>
                <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                  {formatINR(combinedTotalVal)}
                </div>
              </div>
              <div className="bg-white/5 p-2 rounded-lg">
                <div className="text-[10px] text-slate-400">Combined Units</div>
                <div className="text-xs font-bold text-white font-mono mt-0.5">
                  {combinedTotalUnits} u
                </div>
              </div>
              <div className="bg-white/5 p-2 rounded-lg">
                <div className="text-[10px] text-slate-400">July Billing</div>
                <div className="text-xs font-bold font-mono mt-0.5 text-white">
                  {formatINR(combinedJulVal)}
                </div>
              </div>
              <div className="bg-white/5 p-2 rounded-lg">
                <div className="text-[10px] text-slate-400">Linked Visits</div>
                <div className="text-xs font-bold text-white font-mono mt-0.5">
                  {combinedVisits} logged
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleMerge}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <GitMerge size={14} />
              <span>Confirm & Merge Records</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
