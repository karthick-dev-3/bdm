import React from 'react';
import { ChevronRight, AlertCircle, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { EnrichedOutlet } from '../../types/data';

interface CounterCardProps {
  outlet: EnrichedOutlet;
  onSelect: (outlet: EnrichedOutlet) => void;
}

export const CounterCard: React.FC<CounterCardProps> = ({ outlet, onSelect }) => {
  const billing = outlet.billing;
  const maxVal = Math.max(billing.feb26Val, billing.mar26Val, billing.apr26Val, billing.may26Val, billing.jun26Val, billing.jul26Val) || 1;

  const months = [
    { label: 'F', val: billing.feb26Val },
    { label: 'M', val: billing.mar26Val },
    { label: 'A', val: billing.apr26Val },
    { label: 'M', val: billing.may26Val },
    { label: 'J', val: billing.jun26Val },
    { label: 'J', val: billing.jul26Val }
  ];

  // Priority class
  let priorityClass = 'priority-active';
  if (outlet.priorityTier === 'Revenue At Risk') priorityClass = 'priority-high';
  else if (outlet.priorityTier === 'Payment Critical') priorityClass = 'priority-amber';
  else if (outlet.priorityTier === 'Dormant Diagnostic') priorityClass = '';

  return (
    <div
      className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col gap-3 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
        outlet.priorityTier === 'Revenue At Risk'
          ? 'border-rose-300 hover:border-rose-400'
          : outlet.priorityTier === 'Payment Critical'
          ? 'border-amber-300 hover:border-amber-400'
          : 'border-slate-200/80 hover:border-[#E68A00]'
      }`}
      onClick={() => onSelect(outlet)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate">
            {outlet.name}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
            <span className="font-semibold text-slate-700">{outlet.code}</span>
            <span>•</span>
            <span className="text-blue-600 font-medium">{outlet.type}</span>
          </div>
        </div>

        <span
          className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
            outlet.commercialStatus === 'Active'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : outlet.commercialStatus === 'At-Risk'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : outlet.commercialStatus === 'Dormant'
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}
        >
          {outlet.commercialStatus}
        </span>
      </div>

      {/* Credit & Priority Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div>
          <span>Credit: </span>
          <strong className={outlet.creditDays >= 30 ? 'text-amber-600 font-bold' : 'text-slate-800 font-semibold'}>
            {outlet.creditDaysRaw || 'COD'}
          </strong>
        </div>

        {outlet.priorityTier === 'Revenue At Risk' && (
          <span className="text-rose-600 font-bold flex items-center gap-1 text-[0.72rem]">
            <AlertCircle size={12} /> Revenue At Risk
          </span>
        )}

        {outlet.priorityTier === 'Payment Critical' && (
          <span className="text-amber-600 font-bold flex items-center gap-1 text-[0.72rem]">
            <Clock size={12} /> Payment First
          </span>
        )}
      </div>

      {/* Mini 6-Month Sparkline & Value */}
      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
        <div className="flex flex-col">
          <span className="text-[0.68rem] text-slate-400 font-medium">July Billing</span>
          <span className={`text-xs font-bold font-mono ${billing.jul26Val > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
            {billing.jul26Val > 0 ? `₹${(billing.jul26Val / 100000).toFixed(1)}L` : '₹0 (Quiet)'}
          </span>
        </div>

        <div className="flex items-end gap-1 h-6 w-24 justify-end">
          {months.map((m, i) => {
            const h = maxVal > 0 ? Math.round((m.val / maxVal) * 20) : 2;
            const isZero = m.val === 0;
            const isJul = i === 5;
            return (
              <div
                key={i}
                className="w-2.5 rounded-xs transition-all"
                style={{
                  height: `${Math.max(3, h)}px`,
                  background: isZero
                    ? '#E2E8F0'
                    : isJul
                    ? '#E68A00'
                    : '#0EA5E9'
                }}
                title={`${m.label}: ₹${m.val.toLocaleString()}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
