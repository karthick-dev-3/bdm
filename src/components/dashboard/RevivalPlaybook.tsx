import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingDown, Phone, AlertCircle, ArrowUpRight, MapPin, Search } from 'lucide-react';
import { Dataset } from '../../services/dataLoader';
import { formatINR } from '../../utils/formatters';
import { CustomDropdown, DropdownOption } from '../common/CustomDropdown';
import { Pagination } from '../common/Pagination';

interface RevivalPlaybookProps {
  dataset: Dataset;
  selectedBdmCode?: string;
  onSelectOutletForField?: (outletCode: string) => void;
}

export const RevivalPlaybook: React.FC<RevivalPlaybookProps> = ({ dataset, selectedBdmCode = 'ALL', onSelectOutletForField }) => {
  const { outlets, bdms } = dataset;
  const currentBdm = bdms.find((b) => b.code === selectedBdmCode);
  const [selectedTerritory, setSelectedTerritory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 50;

  // Sync selectedTerritory when selectedBdmCode changes
  useEffect(() => {
    if (selectedBdmCode !== 'ALL' && currentBdm) {
      setSelectedTerritory(currentBdm.territory);
    } else {
      setSelectedTerritory('all');
    }
    setCurrentPage(1);
  }, [selectedBdmCode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTerritory, searchQuery]);

  // Filter fading/dormant outlets that had peak revenue >= 2 Lakhs but billed 0 in July
  const revivalTargets = outlets.filter((o) => {
    const hadPeak = o.billing.peakMonthVal >= 200000;
    const quietInJuly = o.billing.jul26Val === 0;
    const territoryMatch = selectedTerritory === 'all' || o.normalizedTown === selectedTerritory;
    const queryMatch = !searchQuery || `${o.name} ${o.code} ${o.ownerName} ${o.normalizedTown}`.toLowerCase().includes(searchQuery.toLowerCase());
    return hadPeak && quietInJuly && territoryMatch && queryMatch;
  }).sort((a, b) => b.billing.peakMonthVal - a.billing.peakMonthVal);

  const pagedRevivalTargets = revivalTargets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalRevAtRisk = revivalTargets.reduce((acc, o) => acc + o.billing.peakMonthVal, 0);

  const territoryOptions: DropdownOption[] = [
    { value: 'all', label: dataset.bdms.length > 0 ? `All ${dataset.bdms.length} Territories` : 'All Territories' },
    ...dataset.bdms.map((b) => ({
      value: b.territory,
      label: `${b.territory} (${b.name})`
    }))
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Playbook Summary Banner Card - Horizontal 2-Column Layout */}
      <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-amber-500 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between gap-6 flex-wrap md:flex-nowrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-amber-600 mb-1.5">
              <RefreshCw size={20} />
              <span className="text-base sm:text-lg font-bold">Dormant Account Revival Playbook</span>
            </div>
            <div className="text-xs sm:text-sm text-slate-500">
              Targeting {revivalTargets.length} key retail outlets that billed heavily (≥ ₹2L/mo) earlier this year but went silent in July 2026.
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[0.68rem] text-slate-400 uppercase tracking-wider font-semibold">
              Monthly Revenue at Risk
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-600 font-mono tracking-tight whitespace-nowrap">
              {formatINR(totalRevAtRisk)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar with Custom Non-Clipping Territory Dropdown & Search */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-56">
            <CustomDropdown
              options={territoryOptions}
              value={selectedTerritory}
              onChange={setSelectedTerritory}
              theme="light"
              icon={<MapPin size={14} />}
              minWidth="220px"
            />
          </div>

          <div className="relative min-w-[280px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search store name, code, town, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[38px] pl-9 pr-4 rounded-full bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E68A00] transition-colors shadow-xs"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-900">{revivalTargets.length}</strong> recovery opportunities
        </div>
      </div>

      {/* 3. High-Value Revival Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Outlet Identity</th>
                <th className="py-3 px-4">Format & Town</th>
                <th className="py-3 px-4">Peak Month (Historical)</th>
                <th className="py-3 px-4">July Billing</th>
                <th className="py-3 px-4">Territory BDM</th>
                <th className="py-3 px-4">Action Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedRevivalTargets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                    No dormant accounts matching criteria in this territory.
                  </td>
                </tr>
              ) : (
                pagedRevivalTargets.map((outlet) => {
                  return (
                    <tr key={outlet.code} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{outlet.name}</div>
                        <div className="text-[0.7rem] text-slate-400">
                          {outlet.code} • Owner: {outlet.ownerName}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{outlet.type}</div>
                        <div className="text-[0.7rem] text-slate-400">{outlet.normalizedTown}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 font-mono">
                          {formatINR(outlet.billing.peakMonthVal)}
                        </div>
                        <div className="text-[0.7rem] text-slate-400">
                          Peak: {outlet.billing.peakMonthName} 2026
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 font-semibold text-rose-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>₹0 (Silent)</span>
                        </div>
                        <div className="text-[0.7rem] text-slate-400">100% Volume Drop</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{outlet.assignedBdmName}</div>
                        <div className="text-[0.7rem] text-slate-400">{outlet.assignedBdmCode}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                            onClick={() => onSelectOutletForField && onSelectOutletForField(outlet.code)}
                          >
                            <span>Open Drawer</span>
                            <ArrowUpRight size={13} />
                          </button>
                          <a
                            href={`tel:${outlet.phone}`}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                            title={`Call ${outlet.ownerName} (${outlet.phone})`}
                          >
                            <Phone size={13} />
                          </a>
                        </div>
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
          totalItems={revivalTargets.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="recovery opportunities"
        />
      </div>
    </div>
  );
};
