import React from 'react';
import { X, Phone, MapPin, Calendar, Clock, DollarSign, ClipboardCheck, Edit3, AlertTriangle } from 'lucide-react';
import { EnrichedOutlet } from '../../types/data';

interface CounterDossierModalProps {
  outlet: EnrichedOutlet | null;
  onClose: () => void;
  onStartChecklist: (outlet: EnrichedOutlet) => void;
  onStartAudit: (outlet: EnrichedOutlet) => void;
}

export const CounterDossierModal: React.FC<CounterDossierModalProps> = ({
  outlet,
  onClose,
  onStartChecklist,
  onStartAudit
}) => {
  if (!outlet) return null;

  const b = outlet.billing;
  const billingMonths = [
    { name: 'Feb 2026', units: b.feb26Units, val: b.feb26Val },
    { name: 'Mar 2026', units: b.mar26Units, val: b.mar26Val },
    { name: 'Apr 2026', units: b.apr26Units, val: b.apr26Val },
    { name: 'May 2026', units: b.may26Units, val: b.may26Val },
    { name: 'Jun 2026', units: b.jun26Units, val: b.jun26Val },
    { name: 'Jul 2026', units: b.jul26Units, val: b.jul26Val }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1B1920] border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <div className="text-base font-bold text-white">
              {outlet.name}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>{outlet.code}</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{outlet.type}</span>
              <span>•</span>
              <span>{outlet.normalizedTown}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-dropdown-menu">
          {/* Outlet Contact Details */}
          <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Owner: {outlet.ownerName || 'Unknown'}</div>
              <div className="text-xs text-slate-400 mt-0.5">Credit Terms: {outlet.creditDaysRaw || 'COD'}</div>
            </div>

            {outlet.phone && outlet.phone !== '0' && (
              <a
                href={`tel:${outlet.phone}`}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 transition-colors"
              >
                <Phone size={13} />
                <span>Call Owner</span>
              </a>
            )}
          </div>

          {/* Alert if Duplicate Suspect */}
          {outlet.isDuplicateSuspect && (
            <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-xl flex items-center gap-2 text-xs text-purple-300">
              <AlertTriangle size={15} className="shrink-0 text-purple-400" />
              <span>Suspected Twin Registration: Shares coordinates or business name with another account.</span>
            </div>
          )}

          {/* 6-Month Billing Timeline Table */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              6-Month Billing History (Feb – Jul 2026)
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/5 text-slate-400 text-left border-b border-white/10">
                    <th className="py-2 px-3 font-semibold">Month</th>
                    <th className="py-2 px-3 font-semibold">Units</th>
                    <th className="py-2 px-3 font-semibold text-right">Invoice Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {billingMonths.map((m) => (
                    <tr key={m.name} className="hover:bg-white/5">
                      <td className="py-2 px-3 font-medium text-white">{m.name}</td>
                      <td className="py-2 px-3 text-slate-300">{m.units}</td>
                      <td className="py-2 px-3 text-right font-bold font-mono">
                        {m.val > 0 ? (
                          <span className="text-emerald-400">₹{(m.val / 100000).toFixed(2)} Lakhs</span>
                        ) : (
                          <span className="text-slate-500">₹0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Previous Visit Intelligence */}
          <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Previous Visit Intelligence
            </div>
            <div className="text-xs text-white">
              {outlet.lastVisitRemarks ? (
                <span>"{outlet.lastVisitRemarks}"</span>
              ) : (
                <span className="text-slate-500 italic">No visit remarks on record</span>
              )}
            </div>
            {outlet.lastVisitDate && (
              <div className="text-[11px] text-slate-400 mt-1">
                Recorded on: {outlet.lastVisitDate} (Total visits logged: {outlet.totalVisitsLogged})
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => onStartChecklist(outlet)}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ClipboardCheck size={18} />
              <span>Start 5-Point Visit Checklist</span>
            </button>

            <button
              onClick={() => onStartAudit(outlet)}
              className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Edit3 size={15} />
              <span>Update Counter Ground Truth / Audit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
