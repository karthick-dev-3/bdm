import React, { useState, useEffect } from 'react';
import { Copy, MapPinOff, SpellCheck, Search, ShieldAlert, AlertTriangle, GitMerge, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Dataset, reloadDataset } from '../../services/dataLoader';
import { isTownNonCanonical } from '../../services/townNormalizer';
import { formatINR } from '../../utils/formatters';
import { Pagination } from '../common/Pagination';
import { MergeTwinModal } from './MergeTwinModal';
import { mergeDuplicateOutletsBackend, unmergeDuplicateOutletBackend } from '../../services/backendSyncService';
import { EnrichedOutlet } from '../../types/data';

interface DataHygieneCenterProps {
  dataset: Dataset;
  selectedBdmCode?: string;
}

export const DataHygieneCenter: React.FC<DataHygieneCenterProps> = ({
  dataset,
  selectedBdmCode = 'ALL'
}) => {
  const { outlets } = dataset;
  const currentBdm = dataset.bdms.find((b) => b.code === selectedBdmCode);

  const [subTab, setSubTab] = useState<'duplicates' | 'missing_coords' | 'aliases' | 'blank_fields' | 'merged'>('duplicates');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTwinPair, setSelectedTwinPair] = useState<EnrichedOutlet[] | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [subTab, searchQuery, selectedBdmCode]);

  // User-scoped outlets if specific BDM
  const userOutlets =
    selectedBdmCode === 'ALL'
      ? outlets
      : outlets.filter((o) => o.assignedBdmCode === selectedBdmCode);

  const duplicates = userOutlets.filter((o) => o.isDuplicateSuspect && !o.isMergedAlias);
  const mergedAliases = userOutlets.filter((o) => o.isMergedAlias);
  const missingCoords = userOutlets.filter((o) => o.hasMissingCoords && !o.isMergedAlias);
  const nonCanonicalTowns = userOutlets.filter((o) => isTownNonCanonical(o.town) && !o.isMergedAlias);
  const blankFieldOutlets = userOutlets.filter((o) => (!o.name || !o.ownerName || !o.phone || o.phone === '0' || o.creditDaysUnknown) && !o.isMergedAlias);

  const filteredDuplicates = duplicates.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return `${o.name} ${o.code} ${o.normalizedTown} ${o.phone} ${o.assignedBdmName}`.toLowerCase().includes(q);
  });

  const filteredMerged = mergedAliases.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return `${o.name} ${o.code} ${o.mergedIntoCode} ${o.normalizedTown}`.toLowerCase().includes(q);
  });

  const filteredMissingCoords = missingCoords.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return `${o.name} ${o.code} ${o.normalizedTown} ${o.assignedBdmName}`.toLowerCase().includes(q);
  });

  const filteredNonCanonicalTowns = nonCanonicalTowns.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return `${o.name} ${o.code} ${o.town} ${o.normalizedTown} ${o.assignedBdmName}`.toLowerCase().includes(q);
  });

  const filteredBlankFields = blankFieldOutlets.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return `${o.name || 'empty'} ${o.code} ${o.town} ${o.normalizedTown} ${o.assignedBdmName}`.toLowerCase().includes(q);
  });

  const pagedDuplicates = filteredDuplicates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagedMerged = filteredMerged.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagedMissingCoords = filteredMissingCoords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagedNonCanonicalTowns = filteredNonCanonicalTowns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagedBlankFields = filteredBlankFields.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleOpenMerge = (outlet: EnrichedOutlet) => {
    // Find candidate twins with matching name or coords
    const cleanName = outlet.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const coordKey = outlet.latitude && outlet.longitude ? `${outlet.latitude.toFixed(4)},${outlet.longitude.toFixed(4)}` : '';
    
    const twins = userOutlets.filter((o) => {
      if (o.code === outlet.code) return true;
      const oClean = o.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const oCoord = o.latitude && o.longitude ? `${o.latitude.toFixed(4)},${o.longitude.toFixed(4)}` : '';
      return (cleanName.length > 3 && oClean === cleanName) || (coordKey && oCoord === coordKey);
    });

    if (twins.length >= 2) {
      setSelectedTwinPair(twins);
    } else {
      // Fallback: search across all master outlets
      const globalTwins = outlets.filter((o) => {
        if (o.code === outlet.code) return true;
        const oClean = o.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const oCoord = o.latitude && o.longitude ? `${o.latitude.toFixed(4)},${o.longitude.toFixed(4)}` : '';
        return (cleanName.length > 3 && oClean === cleanName) || (coordKey && oCoord === coordKey);
      });
      setSelectedTwinPair(globalTwins.length >= 2 ? globalTwins : [outlet, outlet]);
    }
  };

  const handleConfirmMerge = async (primaryCode: string, secondaryCode: string) => {
    setSelectedTwinPair(null);
    await mergeDuplicateOutletsBackend(primaryCode, secondaryCode);
    await reloadDataset();
    setSuccessBanner(`Successfully consolidated ${secondaryCode} into canonical master record ${primaryCode}.`);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  const handleUnmerge = async (secondaryCode: string) => {
    await unmergeDuplicateOutletBackend(secondaryCode);
    await reloadDataset();
    setSuccessBanner(`Unmerged outlet ${secondaryCode}. Restored as standalone record.`);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  type HygieneTabId = 'duplicates' | 'merged' | 'missing_coords' | 'blank_fields' | 'aliases';

  const tabs: { id: HygieneTabId; label: string; icon: any; count: number }[] = [
    { id: 'duplicates', label: 'Duplicate Stores', icon: Copy, count: duplicates.length },
    { id: 'merged', label: 'Merged Records', icon: GitMerge, count: mergedAliases.length },
    { id: 'missing_coords', label: 'Missing GPS Location', icon: MapPinOff, count: missingCoords.length },
    { id: 'blank_fields', label: 'Incomplete Store Details', icon: AlertTriangle, count: blankFieldOutlets.length },
    { id: 'aliases', label: 'City Name Corrections', icon: SpellCheck, count: nonCanonicalTowns.length }
  ];

  const visibleTabs = tabs.filter((t) => t.count > 0);

  useEffect(() => {
    if (visibleTabs.length > 0) {
      const isCurrentVisible = visibleTabs.some((t) => t.id === subTab);
      if (!isCurrentVisible) {
        setSubTab(visibleTabs[0].id);
      }
    }
  }, [duplicates.length, mergedAliases.length, missingCoords.length, blankFieldOutlets.length, nonCanonicalTowns.length, subTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Success Notification Banner */}
      {successBanner && (
        <div style={{ padding: '0.85rem 1.25rem', background: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '8px', color: '#16A34A', fontSize: '0.86rem', fontWeight: 600 }}>
          <CheckCircle2 size={18} />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Scope Banner if specific BDM */}
      {selectedBdmCode !== 'ALL' && currentBdm && (
        <div style={{ padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="var(--color-accent)" />
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Data Quality for {currentBdm.name} ({currentBdm.territory})
            </span>
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
            Auditing {userOutlets.length} territory outlets
          </span>
        </div>
      )}

      {/* Top Filter and Tab Switch Bar */}
      <div className="filter-bar">
        <div className="fox-tab-group" style={{ flexWrap: 'wrap' }}>
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                className={`fox-tab-btn ${subTab === t.id ? 'active' : ''}`}
                onClick={() => setSubTab(t.id)}
              >
                <Icon size={15} />
                <span>{t.label}</span>
                <span className="fox-tab-count">({t.count})</span>
              </button>
            );
          })}
        </div>

        <div className="search-field">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search anomaly records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Sub-tab 1: Suspected Twin Duplicate Master Outlets */}
      {subTab === 'duplicates' && (
        <div className="panel-table">
          <div className="table-bar">
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Suspected Master Duplicate Registrations</div>
              <div className="sub-note">
                Pairs of outlet codes with matching normalized names, identical towns, or matching phone numbers.
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-error)' }}>
              {filteredDuplicates.length} records flagged
            </span>
          </div>
          <div className="table-scroll-wrap">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Outlet Code</th>
                  <th>Trade Name</th>
                  <th>Town</th>
                  <th>Phone Number</th>
                  <th>6-Month Invoiced</th>
                  <th>Assigned BDM</th>
                  <th>Hygiene Risk</th>
                </tr>
              </thead>
              <tbody>
                {pagedDuplicates.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      Zero twin duplicate suspects detected in this territory.
                    </td>
                  </tr>
                ) : (
                  pagedDuplicates.map((o) => (
                    <tr key={o.code}>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{o.code}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{o.type}</div>
                      </td>
                      <td>{o.normalizedTown}</td>
                      <td>{o.phone || 'Missing'}</td>
                      <td style={{ fontWeight: 600, color: o.billing.totalValue6M > 0 ? 'var(--color-primary)' : 'var(--color-error)' }}>
                        {formatINR(o.billing.totalValue6M)}
                      </td>
                      <td>
                        <div>{o.assignedBdmName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{o.assignedBdmCode}</div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-error)', fontWeight: 600, fontSize: '0.78rem' }}>
                          <AlertTriangle size={12} />
                          <span>Twin Duplicate</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredDuplicates.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="duplicate records"
          />
        </div>
      )}

      {/* Sub-tab 1b: Resolved Merged Twins */}
      {subTab === 'merged' && (
        <div className="panel-table">
          <div className="table-bar">
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Consolidated Master Records & Aliases</div>
              <div className="sub-note">
                Outlets successfully merged into canonical masters. Their billing and visits are aggregated into the primary record.
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-success)' }}>
              {filteredMerged.length} records consolidated
            </span>
          </div>
          <div className="table-scroll-wrap">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Alias Code</th>
                  <th>Trade Name</th>
                  <th>Town</th>
                  <th>Merged Canonical Master</th>
                  <th>Assigned Territory</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedMerged.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      No merged alias records yet. Use "Merge Twin" on any twin registration to consolidate.
                    </td>
                  </tr>
                ) : (
                  pagedMerged.map((o) => (
                    <tr key={o.code}>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                          {o.code}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.name}</div>
                        <span style={{ fontSize: '0.7rem', color: '#16A34A', background: '#F0FDF4', padding: '1px 6px', borderRadius: '4px' }}>
                          Merged Alias
                        </span>
                      </td>
                      <td>{o.normalizedTown}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                            {o.mergedIntoCode}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            (Primary Master)
                          </span>
                        </div>
                      </td>
                      <td>{o.assignedBdmName}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleUnmerge(o.code)}
                          className="btn btn-secondary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            borderRadius: '9999px',
                            cursor: 'pointer'
                          }}
                          title="Restore this record as standalone"
                        >
                          <RotateCcw size={11} />
                          <span>Unmerge</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredMerged.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="merged records"
          />
        </div>
      )}

      {/* Sub-tab 2: Outlets Missing GPS Coordinates */}
      {subTab === 'missing_coords' && (
        <div className="panel-table">
          <div className="table-bar">
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Outlets Missing Physical Coordinates (Lat/Lng)</div>
              <div className="sub-note">
                Outlets with blank, zero, or unparseable GPS coordinates in master CSV. Blocks route mapping and beat planning.
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-warning)' }}>
              {filteredMissingCoords.length} outlets require geocoding
            </span>
          </div>
          <div className="table-scroll-wrap">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Outlet Code</th>
                  <th>Outlet Name</th>
                  <th>Town</th>
                  <th>Status</th>
                  <th>Assigned BDM</th>
                  <th>GPS Coordinate Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedMissingCoords.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      All outlets in this territory possess valid physical coordinates.
                    </td>
                  </tr>
                ) : (
                  pagedMissingCoords.map((o) => (
                    <tr key={o.code}>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{o.code}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{o.ownerName}</div>
                      </td>
                      <td>{o.normalizedTown}</td>
                      <td>
                        <span style={{ color: o.commercialStatus === 'Active' ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                          {o.commercialStatus}
                        </span>
                      </td>
                      <td>
                        <div>{o.assignedBdmName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{o.assignedBdmCode}</div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: '0.8rem' }}>
                          Missing (Lat: NaN, Lng: NaN)
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredMissingCoords.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="outlets"
          />
        </div>
      )}

      {/* Sub-tab 3: Town Name Spelling Aliases */}
      {subTab === 'aliases' && (
        <div className="panel-table">
          <div className="table-bar">
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Non-Standard Town Spelling Variants</div>
              <div className="sub-note">
                Outlets registered with colloquial or phonetically misspelt town names. Harmonized by our normalization engine.
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-teal)' }}>
              {filteredNonCanonicalTowns.length} aliases harmonized
            </span>
          </div>
          <div className="table-scroll-wrap">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Outlet Code</th>
                  <th>Outlet Name</th>
                  <th>CSV Raw Town Name</th>
                  <th>Harmonized Canonical Town</th>
                  <th>Assigned BDM</th>
                </tr>
              </thead>
              <tbody>
                {pagedNonCanonicalTowns.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      Zero town spelling anomalies in this territory.
                    </td>
                  </tr>
                ) : (
                  pagedNonCanonicalTowns.map((o) => (
                    <tr key={o.code}>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{o.code}</span>
                      </td>
                      <td>{o.name}</td>
                      <td>
                        <span style={{ color: 'var(--color-error)', textDecoration: 'line-through' }}>{o.town}</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{o.normalizedTown}</span>
                      </td>
                      <td>{o.assignedBdmName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredNonCanonicalTowns.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="aliases"
          />
        </div>
      )}

      {/* Sub-tab 4: Blank Fields & Unknown Credit Terms */}
      {subTab === 'blank_fields' && (
        <div className="panel-table">
          <div className="table-bar">
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Blank Mandatory Fields & Unspecified Credit Terms</div>
              <div className="sub-note">
                Outlets with missing names, empty phone contacts, or blank credit terms that require physical field verification.
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-warning)' }}>
              {filteredBlankFields.length} outlets require data completion
            </span>
          </div>
          <div className="table-scroll-wrap">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Outlet Code</th>
                  <th>Outlet Name</th>
                  <th>Town</th>
                  <th>Owner Name</th>
                  <th>Contact Phone</th>
                  <th>Credit Terms Status</th>
                  <th>Assigned BDM</th>
                </tr>
              </thead>
              <tbody>
                {pagedBlankFields.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      Zero blank field anomalies in this territory.
                    </td>
                  </tr>
                ) : (
                  pagedBlankFields.map((o) => (
                    <tr key={o.code}>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{o.code}</span>
                      </td>
                      <td>
                        {!o.name || o.name.trim() === '' ? (
                          <span style={{ color: 'var(--color-error)', fontWeight: 700, background: '#FEE2E2', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                            [Blank Name in CSV]
                          </span>
                        ) : (
                          <span>{o.name}</span>
                        )}
                      </td>
                      <td>{o.normalizedTown}</td>
                      <td>{o.ownerName || <span style={{ color: 'var(--color-text-muted)' }}>Missing</span>}</td>
                      <td>
                        {!o.phone || o.phone === '0' ? (
                          <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>Missing Phone</span>
                        ) : (
                          o.phone
                        )}
                      </td>
                      <td>
                        {o.creditDaysUnknown ? (
                          <span style={{ color: '#D97706', fontWeight: 600, background: '#FEF3C7', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                            Blank Credit Terms (Needs Check)
                          </span>
                        ) : (
                          <span style={{ fontWeight: 600 }}>{o.creditDaysRaw || 'COD'}</span>
                        )}
                      </td>
                      <td>{o.assignedBdmName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredBlankFields.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="outlets"
          />
        </div>
      )}

      {/* 1-Click Twin Merge Modal */}
      {selectedTwinPair && (
        <MergeTwinModal
          outlets={selectedTwinPair}
          onClose={() => setSelectedTwinPair(null)}
          onConfirmMerge={handleConfirmMerge}
        />
      )}
    </div>
  );
};
