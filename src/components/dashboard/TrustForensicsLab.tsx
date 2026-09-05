import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Clock,
  FileText,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Eye,
  X,
  MapPin,
  Building2,
  Radio,
  Filter,
  RotateCcw,
  Quote,
  ChevronRight,
  FileQuestion,
  Ghost,
  AlertCircle,
  CheckCircle2,
  Copy,
  FileX,
  Calendar,
  Zap,
  Sparkles,
  Info,
  ChevronDown
} from 'lucide-react';
import { Dataset } from '../../services/dataLoader';
import { VisitLog, EnrichedOutlet } from '../../types/data';
import { findCoordinateClusters } from '../../services/trustEngine';
import { Pagination } from '../common/Pagination';
import { formatINR } from '../../utils/formatters';

interface TrustForensicsLabProps {
  dataset: Dataset;
  selectedBdmCode?: string;
}

export const TrustForensicsLab: React.FC<TrustForensicsLabProps> = ({ dataset, selectedBdmCode = 'ALL' }) => {
  const { visits, outlets, bdms } = dataset;
  const currentBdm = bdms.find((b) => b.code === selectedBdmCode);
  const isPrimary = selectedBdmCode === 'ALL';

  // Filter visits for selected BDM (e.g. Sundar R - Chennai, Vetri S - Karur)
  const userVisits = useMemo(() => {
    return isPrimary
      ? visits
      : visits.filter(
          (v) =>
            v.bdmCode === selectedBdmCode ||
            (currentBdm && v.bdmName.trim().toLowerCase() === currentBdm.name.trim().toLowerCase())
        );
  }, [visits, isPrimary, selectedBdmCode, currentBdm]);

  // Filter outlets for selected BDM
  const userOutlets = useMemo(() => {
    return isPrimary ? outlets : outlets.filter((o) => o.assignedBdmCode === selectedBdmCode);
  }, [outlets, isPrimary, selectedBdmCode]);

  // Forensic Categories & Metrics
  const driveByVisits = useMemo(() => userVisits.filter((v) => v.isDriveBy), [userVisits]);
  const blankRemarksVisits = useMemo(
    () => userVisits.filter((v) => !v.remarks || v.remarks.trim().length === 0),
    [userVisits]
  );
  const ghostVisits = useMemo(
    () => userVisits.filter((v) => v.trustFlags.includes('Zero-Billing Sinkhole')),
    [userVisits]
  );
  const cleanVisits = useMemo(() => userVisits.filter((v) => v.trustScore >= 70), [userVisits]);

  // Territory Average Integrity Score
  const avgTrustScore = useMemo(() => {
    if (userVisits.length === 0) return 0;
    const sum = userVisits.reduce((acc, v) => acc + v.trustScore, 0);
    return Math.round(sum / userVisits.length);
  }, [userVisits]);

  // Clusters for physical wall-sharing
  const clusters = useMemo(() => {
    return findCoordinateClusters(
      userOutlets.map((o) => ({
        code: o.code,
        name: o.name,
        lat: o.latitude,
        lng: o.longitude,
        town: o.town
      }))
    );
  }, [userOutlets]);

  // Filter state
  const [filterMode, setFilterMode] = useState<'all' | 'driveby' | 'blank_remarks' | 'ghost_visit' | 'clean'>('all');
  const [scoreThreshold, setScoreThreshold] = useState<'all' | 'critical' | 'suspicious' | 'clean'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllClusters, setShowAllClusters] = useState(false);
  const [inspectingCluster, setInspectingCluster] = useState<ReturnType<typeof findCoordinateClusters>[0] | null>(null);
  const [inspectingVisit, setInspectingVisit] = useState<VisitLog | null>(null);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMode, scoreThreshold, searchQuery, selectedBdmCode]);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return userVisits.filter((v) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = `${v.outletName} ${v.outletCode} ${v.bdmName} ${v.remarks} ${v.purpose}`.toLowerCase();
        if (!match.includes(q)) return false;
      }

      // Mode filter
      if (filterMode === 'driveby' && !v.isDriveBy) return false;
      if (filterMode === 'blank_remarks' && (v.remarks && v.remarks.trim().length > 0)) return false;
      if (filterMode === 'ghost_visit' && !v.trustFlags.includes('Zero-Billing Sinkhole')) return false;
      if (filterMode === 'clean' && v.trustScore < 70) return false;

      // Score threshold filter
      if (scoreThreshold === 'critical' && v.trustScore >= 50) return false;
      if (scoreThreshold === 'suspicious' && (v.trustScore < 50 || v.trustScore >= 70)) return false;
      if (scoreThreshold === 'clean' && v.trustScore < 70) return false;

      return true;
    });
  }, [userVisits, searchQuery, filterMode, scoreThreshold]);

  const pagedVisits = useMemo(() => {
    return filteredVisits.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredVisits, currentPage, PAGE_SIZE]);

  const getScoreMeta = (score: number) => {
    if (score >= 70) {
      return {
        color: '#16A34A',
        bg: '#DCFCE7',
        border: 'rgba(22, 163, 74, 0.25)',
        label: 'Verified',
        level: 'Compliant'
      };
    }
    if (score >= 50) {
      return {
        color: '#D97706',
        bg: '#FEF3C7',
        border: 'rgba(217, 119, 6, 0.25)',
        label: 'Suspicious',
        level: 'Warning'
      };
    }
    return {
      color: '#DC2626',
      bg: '#FEE2E2',
      border: 'rgba(220, 38, 38, 0.25)',
      label: 'Critical',
      level: 'High Risk'
    };
  };

  const renderFlagChip = (flag: string) => {
    let icon = <AlertCircle size={11} color="#64748B" />;
    let text = flag;

    if (flag.includes('Drive-by')) {
      icon = <Zap size={11} color="#64748B" />;
      text = 'Drive-By (≤5m)';
    } else if (flag.includes('Blank Remarks')) {
      icon = <FileQuestion size={11} color="#64748B" />;
      text = 'Blank Log';
    } else if (flag.includes('Template') || flag.includes('Repetitive')) {
      icon = <Copy size={11} color="#64748B" />;
      text = 'Canned Remark';
    } else if (flag.includes('Sinkhole') || flag.includes('Zero-Billing')) {
      icon = <Ghost size={11} color="#64748B" />;
      text = 'Zero-Billing';
    } else if (flag.includes('Missing Duration')) {
      icon = <Clock size={11} color="#64748B" />;
      text = 'Missing Time';
    }

    return (
      <span key={flag} className="audit-signal-tag">
        {icon}
        <span>{text}</span>
      </span>
    );
  };

  const getBdmInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Scope Ribbon when filtered to specific BDM */}
      {!isPrimary && currentBdm && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'rgba(230, 138, 0, 0.12)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.84rem'
              }}
            >
              {getBdmInitials(currentBdm.name)}
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Forensic Scope: {currentBdm.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', marginTop: '1px' }}>
                Territory: <strong>{currentBdm.territory}</strong> • Dedicated Counter Directory: {userOutlets.length} Outlets
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Visits Under Audit
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                {userVisits.length} Logs
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Executive Command & Integrity Overview Card */}
      <div className="forensics-header-card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="forensics-radar-dot" />
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Field Integrity & Telemetry Audit Engine
            </span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: '0 0 4px 0' }}>
            Visit Forensics Lab
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0, maxWidth: '680px', lineHeight: 1.45 }}>
            Cross-examining field visit credibility, geofence veracity, and dwell-time compliance. Automatically flags rapid drive-bys, blank logs, and ghost outlet sinkholes across Tamil Nadu counters.
          </p>
        </div>

        {/* Territory Health Index */}
        <div
          style={{
            background: 'var(--color-canvas-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '14px',
            padding: '1rem 1.4rem',
            minWidth: '260px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Field Integrity Rating
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: getScoreMeta(avgTrustScore).bg,
                color: getScoreMeta(avgTrustScore).color,
                border: `1px solid ${getScoreMeta(avgTrustScore).border}`
              }}
            >
              {getScoreMeta(avgTrustScore).level}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: getScoreMeta(avgTrustScore).color }}>
              {avgTrustScore}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>/ 100</span>
          </div>

          {/* Progress gauge */}
          <div className="trust-bar-bg">
            <div
              className="trust-bar-fill"
              style={{
                width: `${avgTrustScore}%`,
                background: getScoreMeta(avgTrustScore).color
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            <span>{driveByVisits.length} Rapid Dwells</span>
            <span>•</span>
            <span>{blankRemarksVisits.length} Blank Logs</span>
            <span>•</span>
            <span>{ghostVisits.length} Ghost Hits</span>
          </div>
        </div>
      </div>

      {/* 3. 4 Diagnostic KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* Drive By */}
        <div
          className="forensics-metric-card"
          onClick={() => setFilterMode('driveby')}
          style={{
            cursor: 'pointer',
            borderColor: filterMode === 'driveby' ? 'var(--color-warning)' : 'var(--color-border)',
            boxShadow: filterMode === 'driveby' ? '0 0 0 2px rgba(242, 153, 74, 0.25)' : undefined
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="forensics-icon-bubble" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <Zap size={20} />
            </div>
            <span className="audit-micro-chip chip-warning">High Risk</span>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
              {driveByVisits.length}
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              Rapid Drive-By Visits
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.35 }}>
              Logged under 5 mins dwell time. Minimal physical merchandising or consultative depth.
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 600 }}>
            {((driveByVisits.length / Math.max(1, userVisits.length)) * 100).toFixed(1)}% of territory visits
          </div>
        </div>

        {/* Blank Remarks */}
        <div
          className="forensics-metric-card"
          onClick={() => setFilterMode('blank_remarks')}
          style={{
            cursor: 'pointer',
            borderColor: filterMode === 'blank_remarks' ? 'var(--color-error)' : 'var(--color-border)',
            boxShadow: filterMode === 'blank_remarks' ? '0 0 0 2px rgba(235, 87, 87, 0.25)' : undefined
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="forensics-icon-bubble" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              <FileQuestion size={20} />
            </div>
            <span className="audit-micro-chip chip-danger">Audit Failure</span>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
              {blankRemarksVisits.length}
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              Blank Field Remarks
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.35 }}>
              Submitted with zero notes or observations. Directly breaches reporting compliance.
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600 }}>
            {((blankRemarksVisits.length / Math.max(1, userVisits.length)) * 100).toFixed(1)}% compliance failure
          </div>
        </div>

        {/* Ghost Sinkholes */}
        <div
          className="forensics-metric-card"
          onClick={() => setFilterMode('ghost_visit')}
          style={{
            cursor: 'pointer',
            borderColor: filterMode === 'ghost_visit' ? 'var(--color-purple)' : 'var(--color-border)',
            boxShadow: filterMode === 'ghost_visit' ? '0 0 0 2px rgba(155, 81, 224, 0.25)' : undefined
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="forensics-icon-bubble" style={{ background: '#F3E8FF', color: '#9333EA' }}>
              <Ghost size={20} />
            </div>
            <span className="audit-micro-chip chip-purple">Zero ROI</span>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
              {ghostVisits.length}
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              Zero-Billing Sinkholes
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.35 }}>
              Visits to counters that haven't billed a single rupee in 6 months. Wasted bandwidth.
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#9333EA', fontWeight: 600 }}>
            {((ghostVisits.length / Math.max(1, userVisits.length)) * 100).toFixed(1)}% ghost targets
          </div>
        </div>

        {/* Verified High Trust */}
        <div
          className="forensics-metric-card"
          onClick={() => setFilterMode('clean')}
          style={{
            cursor: 'pointer',
            borderColor: filterMode === 'clean' ? 'var(--color-success)' : 'var(--color-border)',
            boxShadow: filterMode === 'clean' ? '0 0 0 2px rgba(39, 174, 96, 0.25)' : undefined
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="forensics-icon-bubble" style={{ background: '#DCFCE7', color: '#16A34A' }}>
              <ShieldCheck size={20} />
            </div>
            <span className="audit-micro-chip" style={{ background: '#DCFCE7', color: '#16A34A' }}>Verified</span>
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
              {cleanVisits.length}
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              Compliant Verified Visits
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.35 }}>
              Thorough counter sessions with compliant dwell times (≥15m) and substantive notes.
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 600 }}>
            {((cleanVisits.length / Math.max(1, userVisits.length)) * 100).toFixed(1)}% trustworthy visits
          </div>
        </div>
      </div>

      {/* 4. Multi-Tenant Adjacency & Proximity Radar (The Madurai & Karur Problem) */}
      <div className="forensics-cluster-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Radio size={16} color="var(--color-accent)" />
              <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                Shared-Wall Proximity Radar (The Madurai Problem)
              </h3>
              <span className="audit-micro-chip chip-warning">
                {clusters.length} Anomaly Clusters
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
              Detects retail counters registered at identical coordinates in the master ledger. Physical verification (photos and indents) required.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {clusters.length > 3 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAllClusters(!showAllClusters)}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem', borderRadius: '8px', fontWeight: 600 }}
              >
                {showAllClusters ? 'Collapse to Top 3' : `View All ${clusters.length} Clusters`}
              </button>
            )}
          </div>
        </div>

        {clusters.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.85rem' }}>
            {(showAllClusters ? clusters : clusters.slice(0, 3)).map((cl) => {
              const townName = (cl.outlets[0]?.town || 'TERRITORY').toUpperCase();
              return (
                <div key={cl.coordKey} className="forensics-cluster-card">
                  <div>
                    {/* Header */}
                    <div className="cluster-card-header">
                      <span className="cluster-town-pill">
                        {townName}
                      </span>
                      <span className="cluster-coord-chip">
                        <MapPin size={11} color="var(--color-accent)" />
                        <span>{cl.coordKey}</span>
                      </span>
                      <span className="audit-micro-chip chip-warning">
                        <Building2 size={11} style={{ flexShrink: 0 }} />
                        <span>{cl.outlets.length} Outlets</span>
                      </span>
                    </div>

                    {/* Outlets Stack */}
                    <div className="cluster-outlets-list" style={{ marginTop: '0.65rem' }}>
                      {cl.outlets.map((o) => {
                        const fullOutlet = outlets.find((item) => item.code === o.code);
                        const isActive = fullOutlet?.billing?.activeInJuly;
                        return (
                          <div key={o.code} className="cluster-outlet-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                              <Building2 size={13} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
                              <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                  {o.name}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginLeft: '4px', fontFamily: 'var(--font-mono)' }}>
                                  ({o.code})
                                </span>
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: '0.66rem',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isActive ? 'rgba(39, 174, 96, 0.1)' : 'rgba(235, 87, 87, 0.1)',
                                color: isActive ? 'var(--color-success)' : 'var(--color-error)',
                                flexShrink: 0
                              }}
                            >
                              {isActive ? 'Active' : 'Dormant'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setInspectingCluster(cl)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.76rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      marginTop: '0.25rem'
                    }}
                  >
                    <Eye size={13} />
                    <span>Inspect {cl.outlets.length > 2 ? 'Cluster' : 'Pair'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-success)', padding: '0.5rem 0' }}>
            <CheckCircle2 size={15} />
            <span>No coordinate clumping detected across active territory.</span>
          </div>
        )}
      </div>

      {/* 5. Filterable Audit Grid & Telemetry Table */}
      <div className="panel-table" style={{ overflow: 'hidden' }}>
        {/* Table Control Bar */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem'
          }}
        >
          {/* Segmented Filter Pills */}
          <div className="fox-tab-group" style={{ flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`fox-tab-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              <span>All Visits</span>
              {userVisits.length > 0 && <span className="fox-tab-count">({userVisits.length})</span>}
            </button>
            <button
              type="button"
              className={`fox-tab-btn ${filterMode === 'driveby' ? 'active' : ''}`}
              onClick={() => setFilterMode('driveby')}
            >
              <Zap size={13} />
              <span>Drive-By (≤5m)</span>
              {driveByVisits.length > 0 && <span className="fox-tab-count">({driveByVisits.length})</span>}
            </button>
            <button
              type="button"
              className={`fox-tab-btn ${filterMode === 'blank_remarks' ? 'active' : ''}`}
              onClick={() => setFilterMode('blank_remarks')}
            >
              <FileQuestion size={13} />
              <span>Blank Notes</span>
              {blankRemarksVisits.length > 0 && <span className="fox-tab-count">({blankRemarksVisits.length})</span>}
            </button>
            <button
              type="button"
              className={`fox-tab-btn ${filterMode === 'ghost_visit' ? 'active' : ''}`}
              onClick={() => setFilterMode('ghost_visit')}
            >
              <Ghost size={13} />
              <span>Ghost Outlets</span>
              {ghostVisits.length > 0 && <span className="fox-tab-count">({ghostVisits.length})</span>}
            </button>
            <button
              type="button"
              className={`fox-tab-btn ${filterMode === 'clean' ? 'active' : ''}`}
              onClick={() => setFilterMode('clean')}
            >
              <ShieldCheck size={13} />
              <span>Verified High-Trust</span>
              {cleanVisits.length > 0 && <span className="fox-tab-count">({cleanVisits.length})</span>}
            </button>
          </div>

          {/* Search & Secondary Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Score Filter */}
            <select
              value={scoreThreshold}
              onChange={(e) => setScoreThreshold(e.target.value as any)}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: '#FFFFFF',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All Score Tiers</option>
              <option value="critical">Critical (&lt; 50)</option>
              <option value="suspicious">Suspicious (50 - 69)</option>
              <option value="clean">Verified (70+)</option>
            </select>

            {/* Search */}
            <div className="search-field" style={{ minWidth: '220px' }}>
              <Search size={14} />
              <input
                type="text"
                placeholder="Search remark, outlet, BDM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div className="table-scroll-wrap">
          <table className="clean-table" style={{ fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '130px' }}>Visit Timestamp</th>
                <th style={{ minWidth: '200px' }}>Retail Outlet</th>
                <th style={{ minWidth: '150px' }}>Assigned BDM</th>
                <th style={{ minWidth: '120px' }}>Dwell Time</th>
                <th style={{ minWidth: '120px' }}>Trust Rating</th>
                <th>Field Remarks & Audit Signals</th>
                <th style={{ textAlign: 'right', minWidth: '90px' }}>Audit</th>
              </tr>
            </thead>
            <tbody>
              {pagedVisits.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--color-text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={32} color="var(--color-success)" />
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>No flagged visit logs match this filter criteria</div>
                      <div style={{ fontSize: '0.76rem' }}>Try clearing the search query or selecting a different filter tab.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedVisits.map((v) => {
                  const meta = getScoreMeta(v.trustScore);
                  const outlet = outlets.find((o) => o.code === v.outletCode);

                  return (
                    <tr key={v.visitId} style={{ transition: 'background-color 100ms ease' }}>
                      {/* Date & Time */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} color="var(--color-text-muted)" />
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                            {v.visitDate}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginLeft: '19px', marginTop: '1px' }}>
                          {v.checkInTime || 'Time Unlogged'}
                        </div>
                      </td>

                      {/* Outlet */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {v.outletName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                            {v.outletCode}
                          </span>
                          <span style={{ color: 'var(--color-border)' }}>•</span>
                          <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: 'var(--color-canvas-bg)', color: 'var(--color-text-secondary)' }}>
                            {outlet?.type || 'General Trade'}
                          </span>
                        </div>
                      </td>

                      {/* BDM */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'var(--color-canvas-bg)',
                              border: '1px solid var(--color-border)',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-text-secondary)'
                            }}
                          >
                            {getBdmInitials(v.bdmName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.78rem' }}>
                              {v.bdmName}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                              {v.bdmCode}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dwell Time */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                            {v.durationMins != null && !isNaN(v.durationMins) ? `${v.durationMins} mins` : '—'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: v.isDriveBy ? '#B45309' : (v.durationMins ? 'var(--color-text-secondary)' : '#94A3B8') }}>
                            {v.isDriveBy ? 'Rapid (≤5m)' : v.durationMins ? 'Standard' : 'Unlogged'}
                          </span>
                        </div>
                      </td>

                      {/* Trust Score Gauge */}
                      <td>
                        <div className="forensics-trust-gauge">
                          <div className="trust-gauge-header">
                            <strong style={{ color: meta.color, fontFamily: 'var(--font-mono)' }}>
                              {v.trustScore}/100
                            </strong>
                            <span style={{ fontSize: '0.68rem', color: meta.color, fontWeight: 600 }}>
                              {meta.label}
                            </span>
                          </div>
                          <div className="trust-bar-bg">
                            <div
                              className="trust-bar-fill"
                              style={{ width: `${v.trustScore}%`, background: meta.color }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Remarks & Audit Signals */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '220px', maxWidth: '420px' }}>
                          {/* Remark Text */}
                          {v.remarks && v.remarks.trim().length > 0 ? (
                            <div style={{ fontSize: '0.82rem', color: '#1E293B', lineHeight: 1.4 }}>
                              "{v.remarks}"
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.76rem', color: '#94A3B8', fontStyle: 'italic' }}>
                              — No remarks recorded
                            </div>
                          )}

                          {/* Audit Flags */}
                          {v.trustFlags.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                              {v.trustFlags.map((flag) => renderFlagChip(flag))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setInspectingVisit(v)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.74rem',
                            borderRadius: '7px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: 600
                          }}
                        >
                          <Eye size={13} />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredVisits.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="visits"
        />
      </div>

      {/* 6. Modal: Detailed Visit Telemetry & Deduction Ledger */}
      {inspectingVisit && (
        <div
          className="modal-backdrop"
          onClick={() => setInspectingVisit(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--color-border)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: inspectingVisit.trustScore >= 70 ? '#DCFCE7' : inspectingVisit.trustScore >= 50 ? '#FEF3C7' : '#FEE2E2',
                    color: getScoreMeta(inspectingVisit.trustScore).color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {inspectingVisit.trustScore >= 70 ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>
                      Visit Audit Details
                    </h3>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '999px',
                        background: getScoreMeta(inspectingVisit.trustScore).bg,
                        color: getScoreMeta(inspectingVisit.trustScore).color,
                        border: `1px solid ${getScoreMeta(inspectingVisit.trustScore).border}`
                      }}
                    >
                      {inspectingVisit.trustScore}/100 • {getScoreMeta(inspectingVisit.trustScore).label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Log ID: <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{inspectingVisit.visitId}</code></span>
                    <span>•</span>
                    <span>Recorded: {inspectingVisit.visitDate} at {inspectingVisit.checkInTime || 'Unlogged'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingVisit(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 120ms ease'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Outlet & Field Rep Profile Cards */}
            {(() => {
              const targetOutlet = outlets.find((o) => o.code === inspectingVisit.outletCode);
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                  {/* Outlet Card */}
                  <div style={{ background: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      <Building2 size={13} color="var(--color-accent)" />
                      <span>Target Counter</span>
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {inspectingVisit.outletName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <code style={{ fontFamily: 'var(--font-mono)' }}>{inspectingVisit.outletCode}</code>
                      <span>•</span>
                      <span>{targetOutlet?.type || 'General Trade'}</span>
                      <span>•</span>
                      <span>{targetOutlet?.normalizedTown || targetOutlet?.town || 'Tamil Nadu'}</span>
                    </div>
                  </div>

                  {/* BDM Card */}
                  <div style={{ background: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      <ShieldCheck size={13} color="var(--color-success)" />
                      <span>Logged Field BDM</span>
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {inspectingVisit.bdmName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <code style={{ fontFamily: 'var(--font-mono)' }}>{inspectingVisit.bdmCode}</code>
                      <span>•</span>
                      <span>Territory Field Representative</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Algorithmic Deduction Ledger */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="var(--color-accent)" />
                <span>Algorithmic Trust Evaluation Ledger</span>
              </div>

              <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Initial */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 0.95rem', background: '#FAFAFC', borderBottom: '1px solid var(--color-border)', fontSize: '0.78rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Baseline Initial Trust Allocation</span>
                  <strong style={{ color: '#16A34A', fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>+100 pts</strong>
                </div>

                {/* Duration Check */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 0.95rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.78rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      Dwell Time Assessment ({inspectingVisit.durationMins ? `${inspectingVisit.durationMins} mins` : 'Missing'})
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {inspectingVisit.isDriveBy
                        ? 'Rapid exit under 5 minutes without recorded store closure'
                        : inspectingVisit.durationMins
                        ? 'Dwell time verified within normal commercial parameters'
                        : 'Missing duration telemetry from mobile check-in'}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: inspectingVisit.isDriveBy ? '#FEE2E2' : inspectingVisit.durationMins ? '#DCFCE7' : '#FEE2E2',
                      color: inspectingVisit.isDriveBy ? '#DC2626' : inspectingVisit.durationMins ? '#16A34A' : '#DC2626'
                    }}
                  >
                    {inspectingVisit.isDriveBy ? '-30 pts' : (inspectingVisit.durationMins ? '0 pts' : '-25 pts')}
                  </span>
                </div>

                {/* Remarks Check */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 0.95rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.78rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      Observation Quality ({inspectingVisit.remarks ? `"${inspectingVisit.remarks}"` : 'Blank'})
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {!inspectingVisit.remarks
                        ? 'Zero notes entered by rep upon counter check-out'
                        : inspectingVisit.trustFlags.includes('Repetitive Template Remark')
                        ? 'Repetitive canned phrase detected across multiple outlets'
                        : 'Substantive custom field notes recorded'}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: !inspectingVisit.remarks ? '#FEE2E2' : inspectingVisit.trustFlags.includes('Repetitive Template Remark') ? '#FEF3C7' : '#DCFCE7',
                      color: !inspectingVisit.remarks ? '#DC2626' : inspectingVisit.trustFlags.includes('Repetitive Template Remark') ? '#D97706' : '#16A34A'
                    }}
                  >
                    {!inspectingVisit.remarks ? '-30 pts' : (inspectingVisit.trustFlags.includes('Repetitive Template Remark') ? '-15 pts' : '0 pts')}
                  </span>
                </div>

                {/* Commercial Sinkhole */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 0.95rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.78rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Commercial Sinkhole Correlation</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {inspectingVisit.trustFlags.includes('Zero-Billing Sinkhole')
                        ? 'Outlet has ₹0 revenue and 0 units billed across entire 6-month historical master'
                        : 'Outlet has active historical revenue activity'}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: inspectingVisit.trustFlags.includes('Zero-Billing Sinkhole') ? '#F3E8FF' : '#DCFCE7',
                      color: inspectingVisit.trustFlags.includes('Zero-Billing Sinkhole') ? '#9333EA' : '#16A34A'
                    }}
                  >
                    {inspectingVisit.trustFlags.includes('Zero-Billing Sinkhole') ? '-15 pts' : '0 pts'}
                  </span>
                </div>

                {/* Final Evaluated Score */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0.95rem', background: '#F8FAFC', fontSize: '0.86rem' }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Final Evaluated Trust Score</strong>
                  <strong style={{ color: getScoreMeta(inspectingVisit.trustScore).color, fontFamily: 'var(--font-mono)', fontSize: '1.05rem' }}>
                    {inspectingVisit.trustScore} / 100
                  </strong>
                </div>
              </div>
            </div>

            {/* Operational Action Recommendation */}
            <div
              style={{
                background: inspectingVisit.trustScore < 50 ? '#FFF5F5' : inspectingVisit.trustScore < 70 ? '#FFFBEB' : '#F0FDF4',
                border: `1px solid ${inspectingVisit.trustScore < 50 ? 'rgba(220, 38, 38, 0.25)' : inspectingVisit.trustScore < 70 ? 'rgba(217, 119, 6, 0.25)' : 'rgba(22, 163, 74, 0.25)'}`,
                borderRadius: '10px',
                padding: '0.9rem 1rem',
                fontSize: '0.78rem',
                lineHeight: 1.45,
                color: 'var(--color-text-primary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: getScoreMeta(inspectingVisit.trustScore).color, marginBottom: '4px' }}>
                {inspectingVisit.trustScore < 50 ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                <span>Operational Supervisor Recommendation:</span>
              </div>
              <div>
                {inspectingVisit.trustScore < 50
                  ? 'Flag for territory review. Re-audit counter via direct phone confirmation with shopkeeper. Do not credit BDM visit allowance for logs under 5 minutes with blank or canned remarks.'
                  : inspectingVisit.trustScore < 70
                  ? 'Review remark depth with BDM during weekly beat cadence. Encourage structured 5-point checklist completion over quick text entries.'
                  : 'Verified high-integrity counter consultation. Valid for territory beat credit and trade incentive calculation.'}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInspectingVisit(null)}
                style={{ padding: '0.45rem 1.35rem', fontSize: '0.82rem', borderRadius: '8px', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Shared-Wall Counter Inspection */}
      {inspectingCluster && (
        <div
          className="modal-backdrop"
          onClick={() => setInspectingCluster(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--color-border)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#FEF3C7',
                    color: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Radio size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>
                      Shared-Wall Counter Inspection
                    </h3>
                    <span className="audit-micro-chip chip-warning">
                      {inspectingCluster.outlets.length} Outlets Clustered
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Territory: <strong style={{ color: 'var(--color-text-primary)' }}>{(inspectingCluster.outlets[0]?.town || 'TERRITORY').toUpperCase()}</strong></span>
                    <span>•</span>
                    <span>GPS Coordinates: <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{inspectingCluster.coordKey}</code></span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingCluster(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Problem Context Banner */}
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.77rem',
                color: 'var(--color-text-primary)',
                lineHeight: 1.45
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#DC2626', marginBottom: '3px' }}>
                <AlertTriangle size={14} />
                <span>Operational Forensic Reality (The Madurai Shared-Wall Problem):</span>
              </div>
              <div>
                In congested retail corridors across Tamil Nadu, multiple distinct mobile retailers share the exact same physical building wall and master coordinates. Physical storefront photos, serial trade board inspection, and booked order indents verify true physical store entry.
              </div>
            </div>

            {/* Clustered Outlets Table */}
            <div className="table-scroll-wrap" style={{ border: '1px solid var(--color-border)', borderRadius: '10px' }}>
              <table className="clean-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Retail Outlet Details</th>
                    <th>Format Type</th>
                    <th>Commercial Status</th>
                    <th>Assigned BDM</th>
                    <th>July 2026 Billing</th>
                    <th>6M Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectingCluster.outlets.map((co) => {
                    const fullOutlet = dataset.outlets.find((o) => o.code === co.code);
                    const b = fullOutlet?.billing;
                    const isActive = b?.activeInJuly;
                    return (
                      <tr key={co.code}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{co.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <code style={{ fontFamily: 'var(--font-mono)' }}>{co.code}</code>
                            <span>•</span>
                            <span>{fullOutlet?.ownerName ? `Owner: ${fullOutlet.ownerName}` : 'Owner: N/A'}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '4px', background: 'var(--color-canvas-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                            {fullOutlet?.type || 'General Trade'}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: isActive ? '#DCFCE7' : b?.totalUnits6M ? '#FEF3C7' : '#FEE2E2',
                              color: isActive ? '#15803D' : b?.totalUnits6M ? '#B45309' : '#DC2626'
                            }}
                          >
                            {isActive ? '● Active' : b?.totalUnits6M ? '● Dormant' : '● Ghost'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{fullOutlet?.assignedBdmName || 'Unassigned'}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{fullOutlet?.assignedBdmCode}</div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {b?.jul26Val ? formatINR(b.jul26Val) : '₹0'} <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>({b?.jul26Units || 0}u)</span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {b?.totalValue6M ? formatINR(b.totalValue6M) : '₹0'} <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>({b?.totalUnits6M || 0}u)</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInspectingCluster(null)}
                style={{ padding: '0.45rem 1.35rem', fontSize: '0.82rem', borderRadius: '8px', fontWeight: 600 }}
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

