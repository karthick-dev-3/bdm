import React from 'react';
import { Layers, Store, TrendingUp } from 'lucide-react';
import { Dataset } from '../../services/dataLoader';
import { formatINR, formatNumberIN } from '../../utils/formatters';

interface TerritoryFormatDistributionCardProps {
  selectedBdmCode: string;
  dataset: Dataset;
}

export const TerritoryFormatDistributionCard: React.FC<TerritoryFormatDistributionCardProps> = ({
  selectedBdmCode,
  dataset
}) => {
  const currentBdm = dataset.bdms.find((b) => b.code === selectedBdmCode);
  const territoryOutlets = selectedBdmCode === 'ALL'
    ? dataset.outlets
    : dataset.outlets.filter((o) => o.assignedBdmCode === selectedBdmCode);

  const formats: Array<'Multi-Yard' | 'Premium Reseller' | 'Mobile Specialist' | 'General Trade'> = [
    'Multi-Yard',
    'Premium Reseller',
    'Mobile Specialist',
    'General Trade'
  ];

  const formatStats = formats.map((fmt) => {
    const list = territoryOutlets.filter((o) => o.type === fmt);
    const activeList = list.filter((o) => o.commercialStatus === 'Active');
    const julVal = list.reduce((acc, o) => acc + o.billing.jul26Val, 0);
    const julUnits = list.reduce((acc, o) => acc + o.billing.jul26Units, 0);
    const pct = list.length > 0 ? Math.round((activeList.length / list.length) * 100) : 0;

    let color = 'var(--color-accent)';
    if (fmt === 'Multi-Yard') color = 'var(--color-purple)';
    if (fmt === 'Premium Reseller') color = 'var(--color-teal)';
    if (fmt === 'General Trade') color = '#27AE60';

    return {
      name: fmt,
      total: list.length,
      active: activeList.length,
      julVal,
      julUnits,
      pct,
      color
    };
  });

  const totalJulVal = territoryOutlets.reduce((acc, o) => acc + o.billing.jul26Val, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Format Performance</h3>
          <span className="text-xs text-slate-400">
            {currentBdm ? `${currentBdm.territory} Beat` : 'Tamil Nadu Network'} • July 2026
          </span>
        </div>
        <div className="text-right">
          <span className="text-[0.68rem] text-slate-400 uppercase tracking-wider font-medium">July Revenue</span>
          <div className="text-base font-bold text-[#E68A00] font-mono">
            {formatINR(totalJulVal)}
          </div>
        </div>
      </div>

      {/* Progress Bars for each Format */}
      <div className="flex flex-col gap-3">
        {formatStats.map((fmt) => (
          <div key={fmt.name} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">{fmt.name}</span>
              <span className="text-slate-500 font-mono text-[0.7rem]">
                {fmt.active} of {fmt.total} Active ({formatINR(fmt.julVal)})
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(4, fmt.pct)}%`,
                  background: fmt.color
                }}
              />
            </div>

            <div className="flex justify-between text-[0.68rem] text-slate-400">
              <span>{fmt.julUnits} Mobiles billed</span>
              <span>{fmt.pct}% reach</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
