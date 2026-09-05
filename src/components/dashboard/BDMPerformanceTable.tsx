import React, { useState } from 'react';
import { Dataset } from '../../services/dataLoader';
import { formatINR } from '../../utils/formatters';
import { Pagination } from '../common/Pagination';

interface BDMPerformanceTableProps {
  dataset: Dataset;
  selectedBdmCode?: string;
}

export const BDMPerformanceTable: React.FC<BDMPerformanceTableProps> = ({ dataset, selectedBdmCode }) => {
  const { bdms, outlets, visits } = dataset;
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  const bdmStats = bdms.map((bdm) => {
    const assignedOutlets = outlets.filter((o) => o.assignedBdmCode === bdm.code);
    const activeJulyOutlets = assignedOutlets.filter((o) => o.commercialStatus === 'Active');
    const ghostOutlets = assignedOutlets.filter((o) => o.commercialStatus === 'Ghost');

    const bdmVisits = visits.filter((v) => v.bdmCode === bdm.code);
    const visitsToGhost = bdmVisits.filter((v) => {
      const target = outlets.find((o) => o.code === v.outletCode);
      return target ? target.billing.totalValue6M === 0 : true;
    });

    const trustSum = bdmVisits.reduce((acc, v) => acc + v.trustScore, 0);
    const avgTrust = bdmVisits.length > 0 ? Math.round(trustSum / bdmVisits.length) : 0;
    const totalRev6M = assignedOutlets.reduce((acc, o) => acc + o.billing.totalValue6M, 0);

    const coveragePct = assignedOutlets.length > 0
      ? Math.round((activeJulyOutlets.length / assignedOutlets.length) * 100)
      : 0;

    return {
      bdm,
      totalOutlets: assignedOutlets.length,
      activeJuly: activeJulyOutlets.length,
      ghostCount: ghostOutlets.length,
      coveragePct,
      visitsCount: bdmVisits.length,
      visitsToGhostCount: visitsToGhost.length,
      ghostVisitPct: bdmVisits.length > 0 ? Math.round((visitsToGhost.length / bdmVisits.length) * 100) : 0,
      avgTrust,
      totalRev6M
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-bold text-sm text-slate-900">
            BDM Field Force Scorecard ({bdms.length} Territories)
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Evaluating active counter conversion, visit logs, and time spent on non-revenue counters
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">BDM Officer</th>
              <th className="py-3 px-4">Territory</th>
              <th className="py-3 px-4">July Active / Total</th>
              <th className="py-3 px-4">Reach %</th>
              <th className="py-3 px-4">Visits Logged</th>
              <th className="py-3 px-4">Ghost Counter Visits</th>
              <th className="py-3 px-4">Trust Score</th>
              <th className="py-3 px-4">6M Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bdmStats.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                  No BDM officer records available in current dataset
                </td>
              </tr>
            ) : (
              bdmStats.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((stat) => {
                const isSelected = selectedBdmCode === stat.bdm.code;
                return (
                  <tr
                    key={stat.bdm.code}
                    className={`transition-colors ${
                      isSelected ? 'bg-amber-500/5' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{stat.bdm.name}</div>
                      <div className="text-[0.7rem] text-slate-400">{stat.bdm.code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{stat.bdm.territory}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{stat.activeJuly} / {stat.totalOutlets}</div>
                      <div className="text-[0.7rem] text-slate-400">{stat.coveragePct}% active</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 min-w-8">{stat.coveragePct}%</span>
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              stat.coveragePct >= 75
                                ? 'bg-emerald-500'
                                : stat.coveragePct >= 60
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${stat.coveragePct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{stat.visitsCount} visits</div>
                      <div className="text-[0.7rem] text-slate-400">total logged</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`font-semibold ${stat.ghostVisitPct > 20 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {stat.visitsToGhostCount} visits
                      </div>
                      <div className={`text-[0.7rem] ${stat.ghostVisitPct > 20 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {stat.ghostVisitPct}% to silent
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          stat.avgTrust >= 70
                            ? 'text-emerald-600'
                            : stat.avgTrust >= 55
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {stat.avgTrust}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold font-mono text-slate-900">
                      {formatINR(stat.totalRev6M)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={bdmStats.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        itemLabel="BDM territories"
      />
    </div>
  );
};
