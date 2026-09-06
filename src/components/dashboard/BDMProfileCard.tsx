import React from 'react';
import { Phone, Mail, MoreHorizontal } from 'lucide-react';
import { Dataset } from '../../services/dataLoader';
import { formatINR } from '../../utils/formatters';

interface BDMProfileCardProps {
  selectedBdmCode: string;
  dataset: Dataset;
}

export const BDMProfileCard: React.FC<BDMProfileCardProps> = ({ selectedBdmCode, dataset }) => {
  const isPrimary = selectedBdmCode === 'ALL';
  const currentBdm = isPrimary
    ? {
        code: 'ALL',
        name: 'Primary Account (Central)',
        territory: 'Tamil Nadu Network',
        phone: '',
        joinedDate: ''
      }
    : (dataset.bdms.find((b) => b.code === selectedBdmCode) || dataset.bdms[0]);

  const assignedOutlets = isPrimary
    ? dataset.outlets
    : dataset.outlets.filter((o) => o.assignedBdmCode === currentBdm.code);

  const activeCount = assignedOutlets.filter((o) => o.commercialStatus === 'Active').length;
  const totalRev6M = assignedOutlets.reduce((acc, o) => acc + o.billing.totalValue6M, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      {/* Header with Avatar & Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 shadow-xs border border-slate-100">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=140&h=140&q=80"
              alt={currentBdm.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-sm font-bold text-slate-900 truncate">{isPrimary ? 'Central Manager' : currentBdm.name}</h4>
            <span className="text-xs text-slate-400 truncate">{isPrimary ? 'Executive Lead — Tamil Nadu Network' : `Territory Lead — ${currentBdm.territory}`}</span>
          </div>
        </div>

        <button type="button" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Options">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Circular Action Buttons */}
      <div className="flex items-center justify-center gap-4 py-2 border-y border-slate-100">
        <a
          href={isPrimary ? "tel:+919840000000" : "tel:+919840123456"}
          className="w-9 h-9 rounded-full bg-[#1B1920] hover:bg-[#E68A00] text-white flex items-center justify-center transition-all hover:-translate-y-0.5"
          title={isPrimary ? "Call Central Operations" : `Call ${currentBdm.name}`}
        >
          <Phone size={15} />
        </a>
        <a
          href={isPrimary ? "mailto:central.ops@mobiletn.com" : `mailto:${currentBdm.code.toLowerCase()}@mobiletn.com`}
          className="w-9 h-9 rounded-full bg-[#1B1920] hover:bg-[#E68A00] text-white flex items-center justify-center transition-all hover:-translate-y-0.5"
          title="Send Official Email"
        >
          <Mail size={15} />
        </a>
      </div>

      {/* Info List */}
      <div className="flex flex-col gap-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Company</span>
          <span className="font-semibold text-slate-800">Mobile TN Distribution</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Assigned Beat</span>
          <span className="font-semibold text-slate-800">{isPrimary ? (dataset.bdms.length > 0 ? `Statewide (All ${dataset.bdms.length} Territories)` : 'Statewide Network') : `${currentBdm.territory} Territory`}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Active Outlets</span>
          <span className="font-semibold text-slate-800">
            <strong className="text-emerald-600 font-bold">{activeCount}</strong> of {assignedOutlets.length} stores
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">{isPrimary ? '6M State Revenue' : '6M Territory Rev'}</span>
          <span className="font-semibold text-[#E68A00] font-mono">
            {formatINR(totalRev6M)}
          </span>
        </div>
      </div>
    </div>
  );
};
