import React from 'react';
import { Dataset } from '../../services/dataLoader';
import { formatINR, formatNumberIN } from '../../utils/formatters';
import { CommercialClassificationGuide } from './CommercialClassificationGuide';

interface OverviewKPIsProps {
  summary: Dataset['summary'];
  dataset?: Dataset;
  selectedBdmCode?: string;
}

export const OverviewKPIs: React.FC<OverviewKPIsProps> = ({
  summary,
  dataset,
  selectedBdmCode = 'ALL'
}) => {
  const isAll = !selectedBdmCode || selectedBdmCode === 'ALL';
  const currentBdm = dataset?.bdms.find((b) => b.code === selectedBdmCode);

  let rev6M = summary.total6MRevenue;
  let units6M = summary.total6MUnits;
  let activeJuly = summary.activeJulyOutlets;
  let totalOutlets = summary.totalMasterOutlets;
  let ghostOutlets = summary.ghostOutlets;
  let visitsToGhost = summary.visitsToGhostOutlets;
  let totalVisits = summary.totalVisits;
  let duplicateCount = summary.duplicateSuspectCount;

  if (!isAll && dataset) {
    const userOutlets = dataset.outlets.filter((o) => o.assignedBdmCode === selectedBdmCode);
    const userVisits = dataset.visits.filter((v) => v.bdmCode === selectedBdmCode);

    totalOutlets = userOutlets.length;
    rev6M = userOutlets.reduce((acc, o) => acc + o.billing.totalValue6M, 0);
    units6M = userOutlets.reduce((acc, o) => acc + o.billing.totalUnits6M, 0);
    activeJuly = userOutlets.filter((o) => o.commercialStatus === 'Active').length;
    ghostOutlets = userOutlets.filter((o) => o.commercialStatus === 'Ghost').length;
    totalVisits = userVisits.length;
    visitsToGhost = userVisits.filter((v) => v.trustFlags.includes('Zero-Billing Sinkhole')).length;
    duplicateCount = userOutlets.filter((o) => o.isDuplicateSuspect).length;
  }

  const ghostPct = totalOutlets > 0 ? Math.round((ghostOutlets / totalOutlets) * 100) : 0;
  const wastedVisitPct = totalVisits > 0 ? Math.round((visitsToGhost / totalVisits) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {isAll ? '6-Month Network Revenue' : `${currentBdm ? currentBdm.territory : 'Territory'} 6M Revenue`}
            </span>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatINR(rev6M)}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium">
            {formatNumberIN(units6M)} Mobiles invoiced {isAll ? 'across Tamil Nadu' : `in ${currentBdm?.territory || 'territory'}`}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active July Billers
            </span>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 flex items-baseline gap-1.5">
              {activeJuly}
              <span className="text-sm text-slate-400 font-normal">
                / {totalOutlets}
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium">
            {totalOutlets > 0 ? Math.round((activeJuly / totalOutlets) * 100) : 0}% commercial billing rate in July 2026
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Dormant & Ghost Counters
            </span>
            <div className="text-2xl font-bold tracking-tight text-rose-600 flex items-baseline gap-1.5">
              {ghostOutlets}
              <span className="text-sm text-slate-400 font-normal">
                ({ghostPct}%)
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium">
            Zero billing on record across all 6 months
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Wasted Visits to Ghost Counters
            </span>
            <div className="text-2xl font-bold tracking-tight text-amber-600 flex items-baseline gap-1.5 font-mono">
              {visitsToGhost.toLocaleString('en-IN')}
              <span className="text-sm text-slate-400 font-normal">
                ({wastedVisitPct}%)
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium">
            {wastedVisitPct}% of visits paid to zero-revenue shops ({visitsToGhost} of {totalVisits})
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Data Duplication Suspects
            </span>
            <div className="text-2xl font-bold tracking-tight text-purple-600 flex items-baseline gap-1.5">
              {duplicateCount}
              <span className="text-sm text-slate-400 font-normal">
                records
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium">
            Suspected twin master registrations in beat
          </div>
        </div>
      </div>

      <CommercialClassificationGuide />
    </div>
  );
};
