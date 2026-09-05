import React, { useState, useEffect, useRef } from 'react';
import { X, Phone, MapPin, CheckCircle2, AlertTriangle, AlertCircle, ShoppingBag, Send, Save, Clock, ChevronRight, DollarSign, Info, Wifi, Camera, Image } from 'lucide-react';
import { EnrichedOutlet, ChecklistSubmission } from '../../types/data';
import { OUTLET_CHECKLISTS } from '../../services/checklistDefinitions';
import { saveNewVisit, getLatestVisitForOutlet } from '../../services/auditStore';
import { formatINR, formatMonthlyBarValue } from '../../utils/formatters';
import { CustomDropdown, DropdownOption } from '../common/CustomDropdown';

interface CounterDetailDrawerProps {
  outlet: EnrichedOutlet | null;
  onClose: () => void;
  onVisitLogged: (submission: ChecklistSubmission) => void;
}

export const CounterDetailDrawer: React.FC<CounterDetailDrawerProps> = ({
  outlet,
  onClose,
  onVisitLogged
}) => {
  if (!outlet) return null;

  const b = outlet.billing;
  const checklistConfig = OUTLET_CHECKLISTS[outlet.type] || OUTLET_CHECKLISTS['General Trade'];

  // Start time recorded as soon as drawer opens
  const [visitStartTime, setVisitStartTime] = useState<number>(() => Date.now());

  // Checklist state
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

  const normalizePaymentTerm = (raw: string | undefined): string => {
    if (!raw) return 'COD';
    const clean = raw.trim().toLowerCase();
    if (clean.includes('15')) return '15 days';
    if (clean.includes('30')) return '30 days';
    if (clean.includes('45')) return '45 days';
    if (clean.includes('60')) return '60 days';
    if (clean.includes('cod') || clean.includes('cash')) return 'COD';
    return raw;
  };

  const [counterCondition, setCounterCondition] = useState<'open' | 'closed' | 'shut_down' | 'disputed'>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    return existing?.counterCondition || 'open';
  });

  const [unitsBooked, setUnitsBooked] = useState<string>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    return existing?.orderBooked?.units ? String(existing.orderBooked.units) : '';
  });

  const [unitPrice, setUnitPrice] = useState<number>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    if (existing?.orderBooked?.units && existing.orderBooked.estimatedValue) {
      return Math.round(existing.orderBooked.estimatedValue / existing.orderBooked.units);
    }
    return 75000; // Standard wholesale iPhone ASP
  });

  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    return existing?.orderBooked?.deliveryDate || '';
  });

  const [paymentCommitment, setPaymentCommitment] = useState<string>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    return existing?.orderBooked?.paymentCommitment || normalizePaymentTerm(outlet.creditDaysRaw);
  });

  const [notes, setNotes] = useState<string>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    return existing?.fieldNotes || '';
  });

  const [isSaved, setIsSaved] = useState(false);

  // Storefront photo verification state
  const [photoPreview, setPhotoPreview] = useState<string | null>(() => {
    const existing = outlet ? getLatestVisitForOutlet(outlet.code) : null;
    return existing?.photoUrl || null;
  });
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever selected outlet changes
  useEffect(() => {
    if (!outlet) return;
    setVisitStartTime(Date.now());
    setIsSaved(false);

    const existing = getLatestVisitForOutlet(outlet.code);
    if (existing) {
      const mergedAnswers: Record<string, { status: 'passed' | 'issue' | 'na'; notes?: string }> = {};
      checklistConfig.items.forEach((item) => {
        mergedAnswers[item.id] = existing.answers?.[item.id] || { status: 'passed', notes: '' };
      });
      setAnswers(mergedAnswers);
      setCounterCondition(existing.counterCondition || 'open');
      if (existing.orderBooked) {
        setUnitsBooked(existing.orderBooked.units > 0 ? String(existing.orderBooked.units) : '');
        if (existing.orderBooked.estimatedValue && existing.orderBooked.units > 0) {
          setUnitPrice(Math.round(existing.orderBooked.estimatedValue / existing.orderBooked.units));
        }
        setDeliveryDate(existing.orderBooked.deliveryDate || '');
        setPaymentCommitment(existing.orderBooked.paymentCommitment || normalizePaymentTerm(outlet.creditDaysRaw));
      } else {
        setUnitsBooked('');
        setDeliveryDate('');
        setPaymentCommitment(normalizePaymentTerm(outlet.creditDaysRaw));
      }
      setNotes(existing.fieldNotes || '');
      setPhotoPreview(existing.photoUrl || null);
    } else {
      const initial: Record<string, { status: 'passed' | 'issue' | 'na'; notes?: string }> = {};
      checklistConfig.items.forEach((item) => {
        initial[item.id] = { status: 'passed', notes: '' };
      });
      setAnswers(initial);
      setCounterCondition('open');
      setUnitsBooked('');
      setUnitPrice(75000);
      setDeliveryDate('');
      setPaymentCommitment(normalizePaymentTerm(outlet.creditDaysRaw));
      setNotes('');
      setPhotoPreview(null);
    }
  }, [outlet?.code]);

  const months = [
    { label: 'Feb', val: b.feb26Val, units: b.feb26Units },
    { label: 'Mar', val: b.mar26Val, units: b.mar26Units },
    { label: 'Apr', val: b.apr26Val, units: b.apr26Units },
    { label: 'May', val: b.may26Val, units: b.may26Units },
    { label: 'Jun', val: b.jun26Val, units: b.jun26Units },
    { label: 'Jul', val: b.jul26Val, units: b.jul26Units }
  ];

  const parsedUnits = parseInt(unitsBooked, 10) || 0;
  const calculatedOrderValue = parsedUnits * unitPrice;
  const isOrderAbove1Lakh = calculatedOrderValue > 100000;
  const isCodSelected = paymentCommitment.trim().toLowerCase().includes('cod') || paymentCommitment.trim().toLowerCase().includes('cash');
  const isCodViolation = isOrderAbove1Lakh && isCodSelected;

  const unitPriceOptions: DropdownOption[] = [
    { value: '62000', label: '₹62,000 (Base iPhone 13/14)' },
    { value: '68000', label: '₹68,000 (iPhone 14 Plus)' },
    { value: '75000', label: '₹75,000 (Network Avg ASP)' },
    { value: '79000', label: '₹79,000 (iPhone 15 128GB)' },
    { value: '94000', label: '₹94,000 (iPhone 15 Plus)' },
    { value: '129000', label: '₹1,29,000 (iPhone 15 Pro / Max)' }
  ];

  // COD is retained in the list, but disabled with tooltip when order exceeds ₹1,00,000
  const paymentOptions: DropdownOption[] = [
    {
      value: 'COD',
      label: 'COD (Cash on Delivery)',
      sublabel: isOrderAbove1Lakh ? 'Disabled for orders > ₹1,00,000' : 'Immediate Cash on Delivery',
      disabled: isOrderAbove1Lakh,
      disabledTooltip: 'COD is disabled for orders above ₹1,00,000 as per Apple commercial credit policy. Please select credit terms.'
    },
    { value: '15 days', label: '15 Days Credit', sublabel: 'Standard Credit Term' },
    { value: '30 days', label: '30 Days Credit', sublabel: 'Standard Credit Term' },
    { value: '45 days', label: '45 Days Credit', sublabel: 'Extended Credit Term' },
    { value: '60 days', label: '60 Days Credit', sublabel: 'Extended Credit Term' }
  ];

  const handleToggleAnswer = (itemId: string, status: 'passed' | 'issue' | 'na') => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], status }
    }));
  };

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

  const handleSaveVisit = () => {
    if (isCodViolation) {
      alert(`Cannot save visit: Orders exceeding ₹1,00,000 (Total: ₹${calculatedOrderValue.toLocaleString('en-IN')}) cannot be placed on COD. Please select credit terms (15/30/45/60 Days).`);
      return;
    }

    const elapsedMinutes = Math.max(1, Math.round((Date.now() - visitStartTime) / 60000));

    const submission: ChecklistSubmission = {
      outletCode: outlet.code,
      bdmCode: outlet.assignedBdmCode,
      visitDate: new Date().toISOString().split('T')[0],
      checkInTimestamp: visitStartTime,
      durationMins: elapsedMinutes,
      answers,
      counterCondition,
      orderBooked: (parsedUnits > 0 || (deliveryDate && deliveryDate.trim().length > 0)) ? {
        units: parsedUnits,
        estimatedValue: calculatedOrderValue,
        deliveryDate: deliveryDate || '',
        paymentCommitment: paymentCommitment || 'COD'
      } : {
        units: 0,
        estimatedValue: 0,
        deliveryDate: '',
        paymentCommitment: paymentCommitment || 'COD'
      },
      fieldNotes: notes,
      verifiedCounterPhotoPromptDone: !!photoPreview,
      photoVerified: !!photoPreview,
      photoUrl: photoPreview || undefined
    };

    saveNewVisit(submission);

    setIsSaved(true);
    onVisitLogged(submission);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-[520px] h-screen bg-white border-l border-slate-200 flex flex-col shadow-2xl overflow-y-auto slide-in-right" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white sticky top-0 z-20 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 truncate">
                {outlet.name}
              </span>
              <span className="text-[0.7rem] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-medium">
                {outlet.code}
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>{outlet.type}</span>
              <span>•</span>
              <span>{outlet.normalizedTown}</span>
              <span>•</span>
              <span className="text-[#E68A00] font-semibold">{outlet.assignedBdmName}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-5 flex-1">
          {isSaved ? (
            <div className="py-16 px-4 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Visit Recorded & Synchronized</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Checklist responses and {parsedUnits > 0 ? `₹${calculatedOrderValue.toLocaleString('en-IN')} purchase order` : 'visit notes'} saved to offline ledger.
              </p>
            </div>
          ) : (
            <>
              {/* Field Offline-Ready Status Banner */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"></span>
                  <Wifi size={13} />
                  <span>Field Offline-Ready</span>
                </div>
                <span className="text-slate-400 text-[0.7rem]">
                  Local Persistence Secured
                </span>
              </div>

              {/* Owner & Contact Row */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <div className="text-xs font-bold text-slate-900">Owner: {outlet.ownerName || 'Not Listed'}</div>
                  <div className="text-[0.72rem] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span>Credit Terms:</span>
                    {outlet.creditDaysUnknown ? (
                      <span className="text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.5 rounded text-[0.68rem]">
                        Unknown — verify with owner
                      </span>
                    ) : (
                      <strong className="text-slate-700">{outlet.creditDaysRaw || 'COD'}</strong>
                    )}
                    {outlet.creditDays >= 30 && <span className="text-amber-600 font-semibold">(Clearance required)</span>}
                  </div>
                </div>

                {outlet.phone && outlet.phone !== '0' && (
                  <a
                    href={`tel:${outlet.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
                  >
                    <Phone size={13} className="text-emerald-600" />
                    <span>Call Owner</span>
                  </a>
                )}
              </div>

              {/* 6-Month Monthly Billing Strip */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">6-Month Invoiced Revenue</span>
                  <span className="text-xs text-slate-900 font-bold font-mono">
                    Total: {formatINR(b.totalValue6M)} ({b.totalUnits6M} units)
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-1.5">
                  {months.map((m, idx) => {
                    const isJul = idx === 5;
                    const hasBill = m.val > 0;
                    return (
                      <div
                        key={m.label}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          hasBill
                            ? isJul
                              ? 'bg-emerald-50/80 border-emerald-200'
                              : 'bg-amber-50/60 border-amber-200/80'
                            : 'bg-slate-50 border-slate-200/70'
                        }`}
                      >
                        <div className="text-[0.68rem] text-slate-400 font-semibold">{m.label}</div>
                        <div className={`text-xs font-bold font-mono ${hasBill ? (isJul ? 'text-emerald-700' : 'text-slate-900') : 'text-slate-400'}`}>
                          {formatMonthlyBarValue(m.val)}
                        </div>
                        <div className="text-[0.65rem] text-slate-400 mt-0.5">
                          {hasBill ? `${m.units}u` : '-'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* The 5-Point Dynamic Checklist */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">
                    5-Point Visit Protocol ({outlet.type})
                  </span>
                  <span className="text-[0.7rem] text-[#E68A00] font-semibold">Format Tailored</span>
                </div>

                {/* Strategic Operational Rationale Callout */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#E68A00]">
                      Why this 5-point protocol for {outlet.type}?
                    </span>
                    <Info size={14} className="text-[#E68A00]" />
                  </div>
                  <div className="text-[0.72rem] text-slate-500 leading-relaxed">
                    {checklistConfig.rationale || checklistConfig.subtitle}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  {checklistConfig.items.map((item, index) => {
                    const ans = answers[item.id]?.status || 'passed';
                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-xs"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-[#E68A00] min-w-4">
                            #{index + 1}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {item.title}
                            </div>
                            <div className="text-[0.72rem] text-slate-400 leading-relaxed mt-0.5">
                              {item.description}
                            </div>
                          </div>
                        </div>

                        {/* Segmented Control */}
                        <div className="flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 gap-1.5">
                          <button
                            type="button"
                            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              ans === 'passed'
                                ? 'bg-emerald-600 text-white shadow-sm border border-emerald-700'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                            onClick={() => handleToggleAnswer(item.id, 'passed')}
                          >
                            <CheckCircle2 size={13} className={ans === 'passed' ? 'text-white' : 'text-emerald-600'} />
                            <span>Verified OK</span>
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              ans === 'issue'
                                ? 'bg-rose-600 text-white shadow-sm border border-rose-700'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                            onClick={() => handleToggleAnswer(item.id, 'issue')}
                          >
                            <AlertTriangle size={13} className={ans === 'issue' ? 'text-white' : 'text-rose-600'} />
                            <span>Issue Found</span>
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              ans === 'na'
                                ? 'bg-slate-800 text-white shadow-sm border border-slate-900'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                            onClick={() => handleToggleAnswer(item.id, 'na')}
                          >
                            <span>N/A</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Commitment & Live Price Calculation */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-bold text-emerald-700 uppercase tracking-wider">
                    Purchase Indent Commitment
                  </span>
                  {parsedUnits > 0 && (
                    <span className="text-xs font-bold text-emerald-700 font-mono">
                      Total: ₹{calculatedOrderValue.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[0.7rem] text-slate-400 block mb-1 font-medium">Units</label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      className="w-full h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-[#E68A00] transition-colors"
                      value={unitsBooked}
                      onChange={(e) => setUnitsBooked(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[0.7rem] text-slate-400 block mb-1 font-medium">Avg Unit Price</label>
                    <CustomDropdown
                      options={unitPriceOptions}
                      value={unitPrice.toString()}
                      onChange={(val) => setUnitPrice(Number(val))}
                      minWidth="100%"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[0.7rem] text-slate-400 block mb-1 font-medium">Promised Dispatch</label>
                    <input
                      type="text"
                      placeholder="e.g. Next Friday"
                      className="w-full h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-[#E68A00] transition-colors"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[0.7rem] text-slate-400 block mb-1 font-medium">Payment Terms</label>
                    <CustomDropdown
                      options={paymentOptions}
                      value={paymentCommitment}
                      onChange={setPaymentCommitment}
                      minWidth="100%"
                      align="right"
                    />
                  </div>
                </div>

                {/* COD Violation Error Banner */}
                {isCodViolation && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs shadow-xs">
                    <AlertCircle size={17} className="shrink-0 text-rose-600 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-rose-900">COD Prohibited for Orders Above ₹1,00,000</span>
                      <span className="text-[0.72rem] text-rose-700 leading-snug">
                        Total order value is <strong>₹{calculatedOrderValue.toLocaleString('en-IN')}</strong> ({formatINR(calculatedOrderValue)}). Cash on Delivery is strictly blocked for orders above ₹1,00,000. Please change Payment Terms to <strong>15/30/45/60 Days Credit</strong> to save.
                      </span>
                    </div>
                  </div>
                )}

                {parsedUnits > 0 && (
                  <div className={`mt-1 p-2.5 rounded-xl text-xs flex justify-between items-center font-medium border ${
                    isCodViolation
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : 'bg-emerald-100/70 border-emerald-200 text-emerald-800'
                  }`}>
                    <span>{parsedUnits} units × ₹{unitPrice.toLocaleString('en-IN')}</span>
                    <strong className={isCodViolation ? 'text-rose-700' : ''}>
                      {formatINR(calculatedOrderValue)} on {paymentCommitment}
                      {isCodViolation && ' (COD BLOCKED)'}
                    </strong>
                  </div>
                )}
              </div>

              {/* Storefront / Bay Photo Verification */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera size={14} className="text-[#E68A00]" /> Storefront & Bay Photo
                  </span>
                  {photoPreview ? (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Attached
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Optional
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
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-28 bg-black">
                    <img src={photoPreview} alt="Counter verification" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Camera size={16} className="text-[#E68A00]" />
                    <span>Take or Upload Counter / Apple Bay Photo</span>
                  </button>
                )}
              </div>

              {/* Field Notes */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">Visit Notes / Counter Agreements</span>
                <textarea
                  rows={2}
                  placeholder="e.g. Owner requested 2 units of iPhone 15 Black on COD, confirmed clearance of June balance..."
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-[#E68A00] transition-colors resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                disabled={isCodViolation}
                className={`w-full py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all mt-2 ${
                  isCodViolation
                    ? 'bg-slate-200 border border-slate-300 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-[#E68A00] hover:bg-[#D07B00] text-white hover:shadow-lg cursor-pointer'
                }`}
                onClick={handleSaveVisit}
              >
                <Send size={15} />
                <span>{isCodViolation ? 'Cannot Save — COD Prohibited Above ₹1 Lakh' : 'Save & Sync Visit Record'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
