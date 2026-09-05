import React from 'react';
import { MoreHorizontal, ArrowRight, Store } from 'lucide-react';
import { EnrichedOutlet } from '../../types/data';
import { formatINR } from '../../utils/formatters';

interface BeatProgressTableProps {
  outlets: EnrichedOutlet[];
  onSelectOutlet: (outlet: EnrichedOutlet) => void;
  onViewAll: () => void;
}

export const BeatProgressTable: React.FC<BeatProgressTableProps> = ({
  outlets,
  onSelectOutlet,
  onViewAll
}) => {
  // Avatar colors palette for circular initials
  const avatarBgColors = ['#EBF8FF', '#FEF3C7', '#EDE9FE', '#DCFCE7', '#FCE7F3', '#E0E7FF'];
  const avatarTextColors = ['#0284C7', '#D97706', '#7C3AED', '#16A34A', '#DB2777', '#4F46E5'];

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Today's Beat Priority Outlets</h3>
        {outlets.length > 0 && (
          <button
            type="button"
            className="bg-[#E68A00] hover:bg-[#D07B00] text-white rounded-full px-4 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            onClick={onViewAll}
          >
            <span>View All</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <th className="pb-3 px-3">Full Outlet Name</th>
              <th className="pb-3 px-3">Format & Town</th>
              <th className="pb-3 px-3">Beat Status</th>
              <th className="pb-3 px-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {outlets.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-400 text-xs">
                  No retail outlet records available in current dataset
                </td>
              </tr>
            ) : (
              outlets.slice(0, 5).map((outlet, index) => {
                const bg = avatarBgColors[index % avatarBgColors.length];
                const fg = avatarTextColors[index % avatarTextColors.length];

                let statusDotColor = 'bg-teal-500';
                let statusLabel = 'Routine Active';

                if (outlet.priorityTier === 'Revenue At Risk') {
                  statusDotColor = 'bg-purple-500';
                  statusLabel = 'Revenue At Risk';
                } else if (outlet.priorityTier === 'Payment Critical') {
                  statusDotColor = 'bg-amber-500';
                  statusLabel = 'Payment Review';
                } else if (outlet.commercialStatus === 'Dormant') {
                  statusDotColor = 'bg-rose-500';
                  statusLabel = 'Dormant Audit';
                }

                return (
                  <tr
                    key={outlet.code}
                    onClick={() => onSelectOutlet(outlet)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    {/* Avatar + Store Name */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 min-w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                          style={{ background: bg, color: fg }}
                        >
                          {getInitials(outlet.name)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate">{outlet.name}</span>
                          <span className="text-xs text-slate-400 truncate">
                            {outlet.code} {outlet.ownerName ? `• ${outlet.ownerName}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Format & Town */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-xs sm:text-sm text-slate-800">{outlet.type}</span>
                        <span className="text-xs text-slate-400">{outlet.normalizedTown}</span>
                      </div>
                    </td>

                    {/* Status with Colored Dot */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className={`w-2 h-2 rounded-full ${statusDotColor}`} />
                        <span className="text-xs font-medium text-slate-600">{statusLabel}</span>
                      </div>
                    </td>

                    {/* More Options */}
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        onClick={() => onSelectOutlet(outlet)}
                        title="Open 5-Point Checklist"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
