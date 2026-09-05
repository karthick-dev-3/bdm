import React, { useState } from 'react';
import { Dataset } from '../../services/dataLoader';
import { formatINR, formatNumberIN } from '../../utils/formatters';

interface RevenueTrendChartProps {
  monthlyData: Dataset['monthlyRevenue'];
  outlets: Dataset['outlets'];
  selectedBdmCode?: string;
  selectedBdmName?: string;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  monthlyData,
  outlets,
  selectedBdmCode = 'ALL',
  selectedBdmName
}) => {
  const [metricMode, setMetricMode] = useState<'outlets' | 'value' | 'units'>('outlets');

  const isAll = !selectedBdmCode || selectedBdmCode === 'ALL';

  // If specific BDM selected, compute their 6-month monthly revenue
  const data = isAll
    ? monthlyData
    : [
        {
          month: '2026-02',
          value: outlets.reduce((acc, o) => acc + o.billing.feb26Val, 0),
          units: outlets.reduce((acc, o) => acc + o.billing.feb26Units, 0),
          activeOutlets: outlets.filter((o) => o.billing.feb26Val > 0).length
        },
        {
          month: '2026-03',
          value: outlets.reduce((acc, o) => acc + o.billing.mar26Val, 0),
          units: outlets.reduce((acc, o) => acc + o.billing.mar26Units, 0),
          activeOutlets: outlets.filter((o) => o.billing.mar26Val > 0).length
        },
        {
          month: '2026-04',
          value: outlets.reduce((acc, o) => acc + o.billing.apr26Val, 0),
          units: outlets.reduce((acc, o) => acc + o.billing.apr26Units, 0),
          activeOutlets: outlets.filter((o) => o.billing.apr26Val > 0).length
        },
        {
          month: '2026-05',
          value: outlets.reduce((acc, o) => acc + o.billing.may26Val, 0),
          units: outlets.reduce((acc, o) => acc + o.billing.may26Units, 0),
          activeOutlets: outlets.filter((o) => o.billing.may26Val > 0).length
        },
        {
          month: '2026-06',
          value: outlets.reduce((acc, o) => acc + o.billing.jun26Val, 0),
          units: outlets.reduce((acc, o) => acc + o.billing.jun26Units, 0),
          activeOutlets: outlets.filter((o) => o.billing.jun26Val > 0).length
        },
        {
          month: '2026-07',
          value: outlets.reduce((acc, o) => acc + o.billing.jul26Val, 0),
          units: outlets.reduce((acc, o) => acc + o.billing.jul26Units, 0),
          activeOutlets: outlets.filter((o) => o.billing.jul26Val > 0).length
        }
      ];

  const maxVal = Math.max(1, ...data.map((m) => m.value));
  const maxUnits = Math.max(1, ...data.map((m) => m.units));
  const maxOutlets = Math.max(1, ...data.map((m) => m.activeOutlets));

  const monthLabels: Record<string, string> = {
    '2026-02': 'Feb 2026',
    '2026-03': 'Mar 2026',
    '2026-04': 'Apr 2026',
    '2026-05': 'May 2026',
    '2026-06': 'Jun 2026',
    '2026-07': 'Jul 2026'
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-base font-bold text-slate-900">
            {isAll ? '6-Month Network Billing & Attrition Trajectory' : `6-Month Billing Trajectory: ${selectedBdmName || selectedBdmCode}`}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {isAll
              ? 'Active billing counters dropped from 466 to 285 between February and July 2026'
              : `Tracking territory monthly sales across ${outlets.length} counters`}
          </div>
        </div>

        {/* Sleek Rounded Tab Group */}
        <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200/70 gap-1 shadow-xs">
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              metricMode === 'outlets'
                ? 'bg-[#E68A00] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setMetricMode('outlets')}
          >
            Active Outlets
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              metricMode === 'value'
                ? 'bg-[#E68A00] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setMetricMode('value')}
          >
            Invoiced Value
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              metricMode === 'units'
                ? 'bg-[#E68A00] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setMetricMode('units')}
          >
            Units Dispatched
          </button>
        </div>
      </div>

      {/* Modern Bars with Smooth Gradients */}
      <div className="grid grid-cols-6 gap-3 sm:gap-4 items-end h-44 py-2 border-b border-slate-100">
        {data.map((item, idx) => {
          let heightPct = 0;
          let displayVal = '';

          if (metricMode === 'outlets') {
            heightPct = Math.round((item.activeOutlets / maxOutlets) * 100);
            displayVal = `${item.activeOutlets} stores`;
          } else if (metricMode === 'value') {
            heightPct = Math.round((item.value / maxVal) * 100);
            displayVal = formatINR(item.value);
          } else {
            heightPct = Math.round((item.units / maxUnits) * 100);
            displayVal = `${formatNumberIN(item.units)} u`;
          }

          const isLowest = idx === 5;

          return (
            <div key={item.month} className="flex flex-col items-center h-full justify-end">
              <span
                className={`text-[0.74rem] font-bold mb-1.5 font-mono ${
                  isLowest ? 'text-amber-600' : 'text-slate-800'
                }`}
              >
                {displayVal}
              </span>
              <div
                className={`w-3/5 rounded-t-md transition-all duration-300 ${
                  isLowest
                    ? 'bg-amber-500 shadow-[0_4px_12px_rgba(242,153,74,0.25)]'
                    : 'bg-[#E68A00] shadow-[0_4px_12px_rgba(230,138,0,0.25)]'
                }`}
                style={{
                  height: `${Math.max(12, heightPct)}%`
                }}
              />
              <span className="text-xs text-slate-500 mt-2.5 font-medium">
                {monthLabels[item.month] || item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
