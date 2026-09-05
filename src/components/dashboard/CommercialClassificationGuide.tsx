import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Moon, Ghost } from 'lucide-react';

export const CommercialClassificationGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs mb-4">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={17} className="text-[#E68A00]" />
          <span className="text-sm font-semibold text-slate-900">
            How Outlets are Classified (Commercial Lifecycle Rules)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <span>{isOpen ? 'Hide Classification Norms' : 'View Classification Norms'}</span>
          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {isOpen && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Active */}
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                <CheckCircle size={14} /> Active Outlets
              </div>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Billed and invoiced stock in July 2026 (current active month). Healthy commercial velocity.
              </p>
            </div>

            {/* At-Risk */}
            <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200">
              <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
                <AlertTriangle size={14} /> Revenue At-Risk
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                Billed in June 2026 but zero in July 2026. High drop-off risk; priority candidate for revival indent.
              </p>
            </div>

            {/* Dormant */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
              <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
                <Moon size={14} /> Dormant Accounts
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Billed historically (Feb–May 2026) but zero across June & July. Requires root cause diagnostic.
              </p>
            </div>

            {/* Ghost */}
            <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200">
              <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs">
                <Ghost size={14} /> Ghost Master Records
              </div>
              <p className="text-xs text-purple-800 mt-1 leading-relaxed">
                Zero billing (0 units, ₹0) across the entire 6-month master dataset. Physical existence audit needed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
