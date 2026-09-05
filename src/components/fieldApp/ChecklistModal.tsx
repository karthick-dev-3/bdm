import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, ShoppingBag, Send, ShieldCheck, ChevronRight, FileText, Camera, Image } from 'lucide-react';
import { EnrichedOutlet, ChecklistSubmission } from '../../types/data';
import { OUTLET_CHECKLISTS } from '../../services/checklistDefinitions';
import { saveNewVisit, getLatestVisitForOutlet } from '../../services/auditStore';

interface ChecklistModalProps {
  outlet: EnrichedOutlet | null;
  onClose: () => void;
  onSuccess: (submission: ChecklistSubmission) => void;
}

export const ChecklistModal: React.FC<ChecklistModalProps> = ({ outlet, onClose, onSuccess }) => {
  if (!outlet) return null;

  const checklistConfig = OUTLET_CHECKLISTS[outlet.type] || OUTLET_CHECKLISTS['General Trade'];

  // Start time recorded as soon as modal opens
  const [visitStartTime, setVisitStartTime] = useState<number>(() => Date.now());

  // State for the 5 items
  const [answers, setAnswers] = useState<Record<string, { status: 'passed' | 'issue' | 'na'; notes?: string }>>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    if (existing?.answers && Object.keys(existing.answers).length > 0) {
      return existing.answers;
    }
    const initial: Record<string, { status: 'passed' | 'issue' | 'na'; notes?: string }> = {};
    checklistConfig.items.forEach((item) => {
      initial[item.id] = { status: 'passed', notes: '' };
    });
    return initial;
  });

  const [counterCondition, setCounterCondition] = useState<'open' | 'closed' | 'shut_down' | 'disputed'>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    return existing?.counterCondition || 'open';
  });

  const [bookingUnits, setBookingUnits] = useState<string>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    return existing?.orderBooked?.units ? String(existing.orderBooked.units) : '';
  });

  const [bookingDeliveryDate, setBookingDeliveryDate] = useState<string>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    return existing?.orderBooked?.deliveryDate || '';
  });

  const [fieldNotes, setFieldNotes] = useState<string>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    return existing?.fieldNotes || '';
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Photo verification state
  const [photoPreview, setPhotoPreview] = useState<string | null>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    return existing?.photoUrl || null;
  });
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever selected outlet changes
  useEffect(() => {
    if (!outlet) return;
    setVisitStartTime(Date.now());
    setIsSuccess(false);

    const existing = getLatestVisitForOutlet(outlet.code);
    if (existing) {
      if (existing.answers && Object.keys(existing.answers).length > 0) {
        setAnswers(existing.answers);
      }
      setCounterCondition(existing.counterCondition || 'open');
      if (existing.orderBooked?.units) {
        setBookingUnits(String(existing.orderBooked.units));
        setBookingDeliveryDate(existing.orderBooked.deliveryDate || '');
      } else {
        setBookingUnits('');
        setBookingDeliveryDate('');
      }
      setFieldNotes(existing.fieldNotes || '');
      setPhotoPreview(existing.photoUrl || null);
    } else {
      const initial: Record<string, { status: 'passed' | 'issue' | 'na'; notes?: string }> = {};
      checklistConfig.items.forEach((item) => {
        initial[item.id] = { status: 'passed', notes: '' };
      });
      setAnswers(initial);
      setCounterCondition('open');
      setBookingUnits('');
      setBookingDeliveryDate('');
      setFieldNotes('');
      setPhotoPreview(null);
    }
  }, [outlet?.code]);

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setPhotoPreview(loadEvt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Situational Guidance Banner
  let situationalBanner = null;
  if (outlet.priorityTier === 'Revenue At Risk') {
    situationalBanner = {
      title: 'Focus: High-Value Revival Diagnostic',
      desc: 'This shop billed heavily before July. Uncover why orders halted before discussing fresh supply.',
      color: '#FF453A'
    };
  } else if (outlet.priorityTier === 'Payment Critical') {
    situationalBanner = {
      title: 'Focus: Payment Reconciliation First',
      desc: 'Counter has active credit exposure. Reconcile ledger before committing fresh inventory.',
      color: '#FF9F0A'
    };
  } else if (outlet.commercialStatus === 'Ghost') {
    situationalBanner = {
      title: 'Focus: Ground Reality Audit',
      desc: 'Zero bills on record for 6 months. Confirm whether store is open, shifted, or buying grey.',
      color: '#BF5AF2'
    };
  }

  const handleStatusChange = (itemId: string, status: 'passed' | 'issue' | 'na') => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], status }
    }));
  };

  const handleSubmit = () => {
    setIsSubmitting(true);

    const units = parseInt(bookingUnits, 10) || 0;
    const estVal = units * 75000; // avg iPhone wholesale ~₹75k
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - visitStartTime) / 60000));

    const submission: ChecklistSubmission = {
      outletCode: outlet.code,
      bdmCode: outlet.assignedBdmCode,
      visitDate: new Date().toISOString().split('T')[0],
      checkInTimestamp: visitStartTime,
      durationMins: elapsedMinutes,
      answers,
      counterCondition,
      orderBooked: units > 0 ? {
        units,
        estimatedValue: estVal,
        deliveryDate: bookingDeliveryDate || 'Within 48 Hours',
        paymentCommitment: estVal > 100000
          ? (outlet.creditDaysRaw && !outlet.creditDaysRaw.toLowerCase().includes('cod') ? outlet.creditDaysRaw : '30 Days Credit')
          : (outlet.creditDaysUnknown ? 'COD (Pending Verification)' : (outlet.creditDaysRaw || 'COD'))
      } : undefined,
      fieldNotes,
      verifiedCounterPhotoPromptDone: !!photoPreview,
      photoVerified: !!photoPreview,
      photoUrl: photoPreview || undefined
    };

    saveNewVisit(submission);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess(submission);
      }, 1000);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1B1920] border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <div className="text-base font-bold text-white">
              {checklistConfig.title}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {outlet.name} ({outlet.code}) • {outlet.type}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-dropdown-menu">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-lg font-bold text-white">Visit Logged & Synced!</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Checklist audit and counter notes have been saved to local memory and synchronized.
              </p>
            </div>
          ) : (
            <>
              {/* Situational Advice */}
              {situationalBanner && (
                <div className="bg-slate-900/90 border-l-4 p-3 rounded-lg" style={{ borderLeftColor: situationalBanner.color }}>
                  <div className="text-xs font-bold" style={{ color: situationalBanner.color }}>
                    {situationalBanner.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    {situationalBanner.desc}
                  </div>
                </div>
              )}

              {/* Counter Condition Status */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Shop Operating Condition
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['open', 'closed', 'shut_down', 'disputed'] as const).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer text-center ${
                        counterCondition === cond
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                      onClick={() => setCounterCondition(cond)}
                    >
                      {cond === 'open' ? 'Open' : cond === 'closed' ? 'Closed' : cond === 'shut_down' ? 'Shut Down' : 'Dispute'}
                    </button>
                  ))}
                </div>
              </div>

              {/* The 5 Tailored Checklist Questions */}
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  The 5 Core Action Items (Format Tailored)
                </div>

                <div className="space-y-2.5">
                  {checklistConfig.items.map((item, idx) => {
                    const currentAns = answers[item.id] || { status: 'passed' };
                    return (
                      <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-amber-400 shrink-0">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-white">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                              {item.description}
                            </div>
                          </div>
                        </div>

                        {/* 1-Tap Toggle Buttons */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <button
                            type="button"
                            className={`py-1.5 px-2 rounded-lg text-xs font-medium border inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                              currentAns.status === 'passed'
                                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 font-bold'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                            onClick={() => handleStatusChange(item.id, 'passed')}
                          >
                            <CheckCircle2 size={13} /> Met Norms
                          </button>
                          <button
                            type="button"
                            className={`py-1.5 px-2 rounded-lg text-xs font-medium border inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                              currentAns.status === 'issue'
                                ? 'bg-rose-500/20 border-rose-500/60 text-rose-400 font-bold'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                            onClick={() => handleStatusChange(item.id, 'issue')}
                          >
                            <AlertTriangle size={13} /> Issue
                          </button>
                          <button
                            type="button"
                            className={`py-1.5 px-2 rounded-lg text-xs font-medium border inline-flex items-center justify-center transition-colors cursor-pointer ${
                              currentAns.status === 'na'
                                ? 'bg-slate-700 border-slate-500 text-white font-bold'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                            onClick={() => handleStatusChange(item.id, 'na')}
                          >
                            N/A
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Commitment Section */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2.5">
                <div className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                  <ShoppingBag size={15} />
                  <span>Next Order Commitment</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Committed Units
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      className="w-full bg-slate-900 border border-white/15 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                      value={bookingUnits}
                      onChange={(e) => setBookingUnits(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Promised Dispatch
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. This Friday"
                      className="w-full bg-slate-900 border border-white/15 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                      value={bookingDeliveryDate}
                      onChange={(e) => setBookingDeliveryDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Storefront / Bay Photo Verification */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Camera size={14} className="text-amber-400" /> Storefront / Merchandising Photo
                  </label>
                  {photoPreview && (
                    <span className="text-[11px] text-emerald-400 font-bold">
                      ✓ Photo Captured
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoSelected}
                />

                {photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden h-28 border border-white/15 bg-black">
                    <img src={photoPreview} alt="Counter verification" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 text-slate-400 text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Camera size={15} className="text-amber-400" />
                    <span>Upload or Capture Storefront Photo</span>
                  </button>
                )}
              </div>

              {/* Quick Field Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Voice / Freeform Remarks (Specific Agreements)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Owner requested 2 units of iPhone 15 Black 128GB on COD, cleared June balance..."
                  className="w-full bg-slate-900 border border-white/15 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500 resize-none"
                  value={fieldNotes}
                  onChange={(e) => setFieldNotes(e.target.value)}
                />
              </div>

              {/* Submit CTA */}
              <button
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send size={16} />
                <span>{isSubmitting ? 'Syncing to Ledger...' : 'Submit & Synchronize Visit Log'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
