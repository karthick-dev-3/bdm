import React, { useState, useEffect } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { EnrichedOutlet, ChecklistSubmission } from '../../types/data';
import { CounterDetailDrawer } from '../fieldApp/CounterDetailDrawer';
import { formatINR } from '../../utils/formatters';
import { Pagination } from '../common/Pagination';

interface OutletsDirectoryViewProps {
  outlets: EnrichedOutlet[];
  selectedBdmCode: string;
  onVisitLogged: (submission: ChecklistSubmission) => void;
}

export const OutletsDirectoryView: React.FC<OutletsDirectoryViewProps> = ({
  outlets,
  selectedBdmCode,
  onVisitLogged
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'julyVal' | 'totalVal'>('totalVal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedOutlet, setSelectedOutlet] = useState<EnrichedOutlet | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter, sortBy, sortOrder, selectedBdmCode]);

  const territoryOutlets = selectedBdmCode === 'ALL'
    ? outlets
    : outlets.filter((o) => o.assignedBdmCode === selectedBdmCode);

  // Formats list with counts
  const formatOptions = [
    { id: 'all', label: 'All Formats', count: territoryOutlets.length },
    { id: 'Multi-Yard', label: 'Multi-Yard', count: territoryOutlets.filter(o => o.type === 'Multi-Yard').length },
    { id: 'Premium Reseller', label: 'Premium Reseller', count: territoryOutlets.filter(o => o.type === 'Premium Reseller').length },
    { id: 'Mobile Specialist', label: 'Mobile Specialist', count: territoryOutlets.filter(o => o.type === 'Mobile Specialist').length },
    { id: 'General Trade', label: 'General Trade', count: territoryOutlets.filter(o => o.type === 'General Trade').length },
  ];

  // Status list with counts
  const statusOptions = [
    { id: 'all', label: 'All Statuses', count: territoryOutlets.length },
    { id: 'Active', label: 'Active', count: territoryOutlets.filter(o => o.commercialStatus === 'Active').length, color: 'var(--color-success)' },
    { id: 'At-Risk', label: 'At-Risk', count: territoryOutlets.filter(o => o.commercialStatus === 'At-Risk').length, color: 'var(--color-warning)' },
    { id: 'Dormant', label: 'Dormant', count: territoryOutlets.filter(o => o.commercialStatus === 'Dormant').length, color: 'var(--color-error)' },
    { id: 'Ghost', label: 'Ghost', count: territoryOutlets.filter(o => o.commercialStatus === 'Ghost').length, color: '#9E9EA7' },
  ];

  const filtered = territoryOutlets.filter((o) => {
    if (search) {
      const q = search.toLowerCase();
      const match = `${o.name} ${o.code} ${o.ownerName} ${o.town} ${o.assignedBdmName}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    if (statusFilter !== 'all' && o.commercialStatus !== statusFilter) return false;
    if (typeFilter !== 'all' && o.type !== typeFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'julyVal') {
      return sortOrder === 'desc'
        ? b.billing.jul26Val - a.billing.jul26Val
        : a.billing.jul26Val - b.billing.jul26Val;
    }
    if (sortBy === 'totalVal') {
      return sortOrder === 'desc'
        ? b.billing.totalValue6M - a.billing.totalValue6M
        : a.billing.totalValue6M - b.billing.totalValue6M;
    }
    return sortOrder === 'desc'
      ? b.name.localeCompare(a.name)
      : a.name.localeCompare(b.name);
  });

  const pagedOutlets = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (column: 'name' | 'julyVal' | 'totalVal') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const formatCreditTerms = (raw: string | undefined) => {
    if (!raw || raw.trim() === '0' || raw.trim().toLowerCase() === 'cod') return 'COD';
    const clean = raw.trim();
    if (clean.toLowerCase().includes('day')) return clean;
    return `${clean} Days`;
  };

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
      {/* 1. Filter Toolbar */}
      <div className="flex flex-col gap-3.5">
        {/* Row 1: Search & Results Counter */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search across ${territoryOutlets.length} counters by store name, code, owner, town...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[38px] pl-9 pr-4 rounded-full bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E68A00] transition-colors shadow-xs"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{filtered.length}</strong> of {territoryOutlets.length} stores
          </div>
        </div>

        {/* Row 2: Format Tabs */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[0.7rem] text-slate-400 font-bold uppercase tracking-wider min-w-[50px]">
            Format:
          </span>
          <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200/70 gap-1 shadow-xs flex-wrap">
            {formatOptions.map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  typeFilter === fmt.id
                    ? 'bg-[#E68A00] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setTypeFilter(fmt.id)}
              >
                <span>{fmt.label}</span>
                <span className={`text-[0.7rem] font-mono ${typeFilter === fmt.id ? 'text-white/80' : 'text-slate-400'}`}>
                  ({fmt.count})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Commercial Status Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[0.7rem] text-slate-400 font-bold uppercase tracking-wider min-w-[50px]">
            Status:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {statusOptions.map((st) => {
              const isSelected = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
                    isSelected
                      ? 'border border-[#E68A00] bg-[#E68A00]/10 text-[#E68A00] font-semibold'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {st.color && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
                  )}
                  <span>{st.label}</span>
                  <span className="text-[0.7rem] opacity-75 font-mono">
                    ({st.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Outlets Table Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-bold text-sm text-slate-900">
              Outlet Master Directory ({filtered.length} Counters)
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Click any counter row to view outlet details & record visit</div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider sticky top-0 z-10">
                <th onClick={() => toggleSort('name')} className="py-3 px-4 cursor-pointer min-w-[220px]">
                  <div className="flex items-center gap-1.5">
                    <span>OUTLET DETAILS</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[150px]">FORMAT</th>
                <th className="py-3 px-4 min-w-[150px]">TERRITORY & BDM</th>
                <th className="py-3 px-4 min-w-[140px]">COMMERCIAL STATUS</th>
                <th onClick={() => toggleSort('julyVal')} className="py-3 px-4 cursor-pointer min-w-[160px]">
                  <div className="flex items-center gap-1.5">
                    <span>JULY INVOICED</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => toggleSort('totalVal')} className="py-3 px-4 cursor-pointer min-w-[130px]">
                  <div className="flex items-center gap-1.5">
                    <span>6M REVENUE</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[110px]">CREDIT TERMS</th>
                <th className="py-3 px-4 min-w-[100px]">LOGGED VISITS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedOutlets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                    No retail outlets found. If outlets.csv is missing, please upload it via Data &amp; CSV Manager.
                  </td>
                </tr>
              ) : (
                pagedOutlets.map((o) => {
                  const creditDisplay = formatCreditTerms(o.creditDaysRaw);
                  const isOverdueRisk = o.creditDays >= 30;
                  const statusCfg = getStatusConfig(o.commercialStatus);

                  return (
                    <tr
                      key={o.code}
                      onClick={() => setSelectedOutlet(o)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{o.name}</div>
                        <div className="text-[0.7rem] text-slate-400 mt-0.5">
                          {o.code} • Owner: {o.ownerName || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                        {o.type}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{o.normalizedTown}</div>
                        <div className="text-[0.7rem] text-slate-400">{o.assignedBdmName}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.color }} />
                          <span className="font-semibold text-xs" style={{ color: statusCfg.color }}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold">
                        <span className={o.billing.jul26Val > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                          {formatINR(o.billing.jul26Val)}
                        </span>
                        {o.billing.jul26Units > 0 && (
                          <span className="text-[0.7rem] text-slate-400 font-normal ml-1 font-sans">
                            ({o.billing.jul26Units}u)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-bold font-mono text-slate-900">
                        {formatINR(o.billing.totalValue6M)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-semibold ${isOverdueRisk ? 'text-amber-600' : 'text-slate-500'}`}>
                          {creditDisplay}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                        {o.totalVisitsLogged} visits
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
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="stores"
        />
      </div>

      <CounterDetailDrawer
        outlet={selectedOutlet}
        onClose={() => setSelectedOutlet(null)}
        onVisitLogged={onVisitLogged}
      />
    </div>
  );
};
