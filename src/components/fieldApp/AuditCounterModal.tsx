import React, { useState } from 'react';
import { X, CheckCircle2, Save } from 'lucide-react';
import { EnrichedOutlet } from '../../types/data';
import { saveCounterAudit } from '../../services/auditStore';

interface AuditCounterModalProps {
  outlet: EnrichedOutlet | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuditCounterModal: React.FC<AuditCounterModalProps> = ({ outlet, onClose, onSuccess }) => {
  if (!outlet) return null;

  const [status, setStatus] = useState<'Open & Trading' | 'Temporarily Shut' | 'Permanently Closed' | 'Duplicate / Shifted'>('Open & Trading');
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    saveCounterAudit({
      outletCode: outlet.code,
      bdmCode: outlet.assignedBdmCode,
      timestamp: new Date().toISOString(),
      operationalStatus: status,
      notes: auditNotes
    });

    setIsSaved(true);
    setTimeout(() => {
      onSuccess();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1B1920] border border-white/10 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden text-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-white">
              Counter Ground Truth Audit
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {outlet.name} ({outlet.code})
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isSaved ? (
            <div className="py-8 px-4 text-center">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">Audit Record Saved</h4>
              <p className="text-xs text-slate-400 mt-1">Master data discrepancy flagged for territory review.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Operational Ground Truth
                </label>
                <select
                  className="w-full bg-slate-900 border border-white/15 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="Open & Trading">Open & Actively Trading</option>
                  <option value="Temporarily Shut">Temporarily Shut / Renovating</option>
                  <option value="Permanently Closed">Permanently Closed / Defunct</option>
                  <option value="Duplicate / Shifted">Duplicate Record / Shifted Location</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Audit Notes & Master Discrepancies
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Shop signboard changed from Sakthi to Modern, duplicate of OA0810, verified owner phone..."
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Save size={16} />
                <span>Save Ground Truth Update</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
