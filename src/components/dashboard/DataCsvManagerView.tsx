import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Database,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  X,
  FileCheck,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import Papa from 'papaparse';
import { Dataset, reloadDataset, getDefaultCsvText, getDiskCsvText } from '../../services/dataLoader';
import {
  CsvCategory,
  CsvFileMetadata,
  getAllMetadata,
  saveCategoryCsv,
  deleteCategoryCsv,
  deleteFileCsv,
  getFileCsv,
  resetAllToDefault,
  getCategoryCsv
} from '../../services/dbStore';
import {
  CATEGORY_SCHEMAS,
  validateCsvContent,
  ValidationResult,
  mergeCsvRecords
} from '../../services/csvValidator';
import {
  exportVisitsAsCsv,
  exportAuditsAsCsv,
  getSavedVisits,
  getSavedAudits
} from '../../services/auditStore';

interface DataCsvManagerViewProps {
  dataset: Dataset;
  onDatasetUpdated?: () => void;
}

interface QueuedFile {
  id: string;
  file: File;
  rawText: string;
  category: CsvCategory | null;
  validation: ValidationResult;
}

interface ActiveViewerData {
  title: string;
  category: CsvCategory;
  fileName: string;
  isCustom: boolean;
  rawText: string;
  rows: Record<string, any>[];
  columns: string[];
}

export const DataCsvManagerView: React.FC<DataCsvManagerViewProps> = ({ dataset, onDatasetUpdated }) => {
  const [metadata, setMetadata] = useState<Record<CsvCategory, CsvFileMetadata[]>>({
    bdms: [],
    outlets: [],
    'billing-monthly': [],
    'visit-log': []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);

  // Active Data Viewer Modal State (Top 10 Previews)
  const [activeViewer, setActiveViewer] = useState<ActiveViewerData | null>(null);

  // Deletion Approval Modal State
  const [deletingCategory, setDeletingCategory] = useState<CsvCategory | null>(null);
  const [deletingFile, setDeletingFile] = useState<CsvFileMetadata | null>(null);
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleCategoryInputRef = useRef<HTMLInputElement>(null);
  const [targetCategoryForSingleUpload, setTargetCategoryForSingleUpload] = useState<CsvCategory | null>(null);

  const loadMeta = async () => {
    try {
      const meta = await getAllMetadata();
      setMetadata(meta);
    } catch (e) {
      console.error('Failed to load CSV metadata', e);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4000);
  };

  // Process selected files from drag-drop or file picker
  const processFiles = async (files: FileList | File[], forceCategory?: CsvCategory) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const newQueue: QueuedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isCsvName = file.name.toLowerCase().endsWith('.csv');
      const isCsvType = file.type.includes('csv') || file.type.includes('excel') || file.type.includes('plain') || file.type === '';
      if (!isCsvName && !isCsvType) {
        continue;
      }

      try {
        const rawText = await file.text();
        const validation = validateCsvContent(rawText, forceCategory, file.name);

        newQueue.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          rawText,
          category: validation.category,
          validation
        });
      } catch (err) {
        console.error(`Error reading file ${file.name}`, err);
      }
    }

    if (newQueue.length > 0) {
      setQueuedFiles((prev) => [...prev, ...newQueue]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleCategorySelectionChange = (id: string, newCategory: CsvCategory) => {
    setQueuedFiles((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const validation = validateCsvContent(item.rawText, newCategory, item.file.name);
          return {
            ...item,
            category: newCategory,
            validation
          };
        }
        return item;
      })
    );
  };

  const removeQueuedFile = (id: string) => {
    setQueuedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  // Commit all queued files to SQLite database (merging multi-file batches per category)
  const handleCommitUploads = async () => {
    const validItems = queuedFiles.filter((q) => q.category && q.validation.isValid);
    if (validItems.length === 0) return;

    setIsLoading(true);
    try {
      let appliedCount = 0;

      // Group items by category to combine/merge multiple files targeting the same category
      const categoryMap = new Map<CsvCategory, QueuedFile[]>();
      for (const item of validItems) {
        const cat = item.category!;
        if (!categoryMap.has(cat)) categoryMap.set(cat, []);
        categoryMap.get(cat)!.push(item);
      }

      for (const [category, filesForCat] of categoryMap.entries()) {
        for (const item of filesForCat) {
          await saveCategoryCsv(category, item.rawText, item.file.name, item.validation.totalRows);
          appliedCount++;
        }
      }

      await reloadDataset();
      await loadMeta();
      setQueuedFiles([]);
      if (onDatasetUpdated) onDatasetUpdated();
      showNotification(`Successfully uploaded and applied ${appliedCount} dataset file${appliedCount > 1 ? 's' : ''} to SQLite database.`);
    } catch (e) {
      console.error('Failed to commit uploads', e);
      alert('An error occurred while saving files to database. Please check file formatting.');
    } finally {
      setIsLoading(false);
    }
  };

  // Approve and execute deletion of a specific uploaded CSV file
  const handleApproveDeleteFile = async () => {
    if (!deletingFile) return;
    const file = deletingFile;
    setDeletingFile(null);
    setIsLoading(true);

    try {
      await deleteFileCsv(file.id);
      await reloadDataset();
      await loadMeta();
      if (onDatasetUpdated) onDatasetUpdated();
      showNotification(`File "${file.fileName}" removed from ${CATEGORY_SCHEMAS[file.category].displayName}.`);
    } catch (e) {
      console.error('Failed to delete file', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Approve and execute deletion of all custom CSVs for a category
  const handleApproveDelete = async () => {
    if (!deletingCategory) return;
    const cat = deletingCategory;
    setDeletingCategory(null);
    setIsLoading(true);

    try {
      await deleteCategoryCsv(cat);
      await reloadDataset();
      await loadMeta();
      if (onDatasetUpdated) onDatasetUpdated();
      showNotification(`All custom files for ${CATEGORY_SCHEMAS[cat].displayName} removed. Reverted to factory baseline data.`);
    } catch (e) {
      console.error('Failed to delete category CSV', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Factory reset all datasets
  const handleApproveResetAll = async () => {
    setIsResetAllModalOpen(false);
    setIsLoading(true);

    try {
      await resetAllToDefault();
      await reloadDataset();
      await loadMeta();
      if (onDatasetUpdated) onDatasetUpdated();
      showNotification('All datasets successfully reset to default factory baseline.');
    } catch (e) {
      console.error('Failed to reset database', e);
    } finally {
      setIsLoading(false);
    }
  };

  // View a specific single uploaded CSV file
  const openSingleFileViewer = async (fileMeta: CsvFileMetadata) => {
    try {
      const fileData = await getFileCsv(fileMeta.id);
      const csvText = fileData ? fileData.csvContent : '';
      const parsed = csvText
        ? Papa.parse<Record<string, any>>(csvText, { header: true, skipEmptyLines: true })
        : { data: [], meta: { fields: [] } };

      setActiveViewer({
        title: `${fileMeta.fileName} (${CATEGORY_SCHEMAS[fileMeta.category].displayName})`,
        category: fileMeta.category,
        fileName: fileMeta.fileName,
        isCustom: true,
        rawText: csvText,
        rows: parsed.data || [],
        columns: parsed.meta.fields && parsed.meta.fields.length > 0 ? parsed.meta.fields : CATEGORY_SCHEMAS[fileMeta.category].requiredHeaders
      });
    } catch (e) {
      console.error('Failed to load file for viewing', e);
    }
  };

  // Open dataset viewer for either an active category or a queued file (Top 10 Previews)
  const openActiveCategoryViewer = async (cat: CsvCategory) => {
    try {
      const custom = await getCategoryCsv(cat);
      const diskText = getDiskCsvText(`${cat}.csv`, cat);
      const csvText = custom !== null ? custom : diskText;
      const hasContent = !!(csvText && csvText.trim().length > 0);
      const files = metadata[cat] || [];

      const parsed = hasContent
        ? Papa.parse<Record<string, any>>(csvText, { header: true, skipEmptyLines: true })
        : { data: [], meta: { fields: [] } };

      const displayFileName = files.length > 1
        ? `${files.length} Combined Files (${files.map((f) => f.fileName).join(', ')})`
        : files.length === 1
        ? files[0].fileName
        : (hasContent ? `${cat}.csv (Built-in Default)` : `${cat}.csv (No File / Empty)`);

      setActiveViewer({
        title: files.length > 1 ? `${CATEGORY_SCHEMAS[cat].displayName} (Combined Data)` : CATEGORY_SCHEMAS[cat].displayName,
        category: cat,
        fileName: displayFileName,
        isCustom: files.length > 0,
        rawText: csvText || '',
        rows: parsed.data || [],
        columns: parsed.meta.fields && parsed.meta.fields.length > 0 ? parsed.meta.fields : CATEGORY_SCHEMAS[cat].requiredHeaders
      });
    } catch (e) {
      console.error('Failed to load dataset for viewing', e);
    }
  };

  const openQueuedFileViewer = (queued: QueuedFile) => {
    const parsed = Papa.parse<Record<string, any>>(queued.rawText, { header: true, skipEmptyLines: true });
    setActiveViewer({
      title: queued.category ? CATEGORY_SCHEMAS[queued.category].displayName : 'Unassigned Upload',
      category: queued.category || 'outlets',
      fileName: queued.file.name,
      isCustom: true,
      rawText: queued.rawText,
      rows: parsed.data,
      columns: parsed.meta.fields || []
    });
  };

  // Export/Download active CSV
  const handleExportCsv = async (category: CsvCategory) => {
    try {
      const custom = await getCategoryCsv(category);
      const csvText = custom || getDefaultCsvText(category);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${category}-active-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export CSV', e);
    }
  };

  // Get current active metrics for each category
  const getCategoryStats = (cat: CsvCategory) => {
    switch (cat) {
      case 'bdms':
        return { count: dataset.bdms.length, label: 'BDM Field Officers' };
      case 'outlets':
        return { count: dataset.outlets.length, label: 'Retail Outlets' };
      case 'billing-monthly':
        return {
          count: dataset.monthlyRevenue.reduce((acc, m) => acc + m.units, 0),
          label: 'Total Units Billed (6M)'
        };
      case 'visit-log':
        return { count: dataset.visits.length, label: 'Field Visits Logged' };
    }
  };

  const categoriesList: CsvCategory[] = ['outlets', 'billing-monthly', 'bdms', 'visit-log'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            padding: '14px 20px',
            borderRadius: 'var(--radius-medium)',
            boxShadow: 'var(--shadow-xl)',
            borderLeft: '4px solid var(--color-success)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <CheckCircle2 size={20} color="var(--color-success)" />
          <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{actionSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="panel-table" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-small)',
                  background: 'rgba(230, 138, 0, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent)'
                }}
              >
                <Database size={20} />
              </div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Data & CSV Management Center
              </h1>
            </div>
            <p className="sub-note" style={{ marginTop: '0.35rem' }}>
              Upload and manage commercial datasets stored in SQLite database. Supports simultaneous multi-file CSV uploads with automatic schema validation and dataset merging.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsResetAllModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '8px 14px' }}
              title="Reset all datasets back to default factory demo baseline"
            >
              <RotateCcw size={14} />
              <span>Reset All to Factory Defaults</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Universal Drag & Drop Multi-File Upload Zone */}
      <div
        className="panel-table"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          padding: '2.5rem 1.5rem',
          border: isDraggingOver ? '2px dashed var(--color-accent)' : '1px dashed var(--color-border)',
          backgroundColor: isDraggingOver ? 'rgba(230, 138, 0, 0.06)' : 'var(--color-surface)',
          borderRadius: 'var(--radius-large)',
          textAlign: 'center',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".csv,text/csv,text/plain,application/vnd.ms-excel,application/csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--color-canvas-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
              border: '1px solid var(--color-border)'
            }}
          >
            <UploadCloud size={28} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Drop Single or Multiple CSV Files Here
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Drag & drop one or multiple CSVs, or <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>click to browse</span> from your device
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginTop: '0.4rem'
            }}
          >
            {categoriesList.map((cat) => (
              <span
                key={cat}
                style={{
                  fontSize: '0.72rem',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  background: 'var(--color-canvas-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500
                }}
              >
                {CATEGORY_SCHEMAS[cat].displayName}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Staged Upload Queue (When files are staged for upload) */}
      {queuedFiles.length > 0 && (
        <div className="panel-table" style={{ padding: '1.5rem', border: '1px solid var(--color-accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck size={18} color="var(--color-accent)" />
                <span>Staged CSV Uploads ({queuedFiles.length} file{queuedFiles.length > 1 ? 's' : ''})</span>
              </div>
              <div className="sub-note">
                Files are validated and ready to be saved into SQLite database.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setQueuedFiles([])}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                Clear Queue
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCommitUploads}
                disabled={isLoading || queuedFiles.some((q) => !q.validation.isValid)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                  padding: '8px 16px',
                  opacity: isLoading || queuedFiles.some((q) => !q.validation.isValid) ? 0.6 : 1
                }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={15} />
                    <span>Save & Apply Uploads</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="clean-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Target Category</th>
                  <th>Rows & Size</th>
                  <th>Validation Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queuedFiles.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <FileSpreadsheet size={18} color="var(--color-accent)" />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.file.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            {(item.file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        value={item.category || ''}
                        onChange={(e) => handleCategorySelectionChange(item.id, e.target.value as CsvCategory)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-small)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-canvas-bg)',
                          color: 'var(--color-text-primary)',
                          fontSize: '0.8rem',
                          fontWeight: 500
                        }}
                      >
                        <option value="" disabled>Select Category</option>
                        {categoriesList.map((cat) => (
                          <option key={cat} value={cat}>
                            {CATEGORY_SCHEMAS[cat].displayName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.validation.totalRows} rows</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        {item.validation.detectedHeaders.length} columns detected
                      </div>
                    </td>
                    <td>
                      {item.validation.isValid ? (
                        <span className="status-pill pill-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Valid Schema
                        </span>
                      ) : (
                        <div>
                          <span className="status-pill pill-dormant" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> Invalid Schema
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-error)', marginTop: '2px' }}>
                            {item.validation.errors[0] || 'Missing required headers'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => openQueuedFileViewer(item)}
                          title="View table records"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <Eye size={13} color="var(--color-accent)" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQueuedFile(item.id)}
                          title="Remove from queue"
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-small)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: 'var(--color-error)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Active Core Datasets (Only display cards that currently contain data) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
            Active Core Datasets
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            {categoriesList.filter((c) => getCategoryStats(c).count > 0).length} of 4 datasets active
          </span>
        </div>

        {categoriesList.filter((c) => getCategoryStats(c).count > 0).length === 0 ? (
          <div
            className="panel-table"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-large)',
              border: '1px dashed var(--color-border)'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(230, 138, 0, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)',
                marginBottom: '1rem'
              }}
            >
              <FileSpreadsheet size={26} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
              No Active Datasets Loaded
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '440px', margin: '0 auto', lineHeight: '1.5' }}>
              There are currently no datasets available. Drag &amp; drop your CSV files into the upload zone above or use "Reset All to Factory Defaults" to restore baseline data.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {categoriesList
              .filter((cat) => getCategoryStats(cat).count > 0)
              .map((cat) => {
                const schema = CATEGORY_SCHEMAS[cat];
                const files = metadata[cat] || [];
                const stats = getCategoryStats(cat);
                const isCustom = files.length > 0;

                return (
                  <div
                    key={cat}
                    className="panel-table"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: isCustom ? '1px solid rgba(230, 138, 0, 0.35)' : '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-large)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div>
                      {/* Card Header & Status Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: isCustom ? 'rgba(230, 138, 0, 0.1)' : 'var(--color-canvas-bg)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-accent)',
                              border: '1px solid var(--color-border)',
                              flexShrink: 0
                            }}
                          >
                            <FileSpreadsheet size={16} />
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.92rem',
                              color: 'var(--color-text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={schema.displayName}
                          >
                            {schema.displayName}
                          </span>
                        </div>

                        {/* Top Right Actions: Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                          {isCustom ? (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'rgba(230, 138, 0, 0.12)',
                                color: '#d97706',
                                border: '1px solid rgba(230, 138, 0, 0.3)',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
                              <span>{files.length} {files.length === 1 ? 'File' : 'Files'}</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 500,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'var(--color-canvas-bg)',
                                color: 'var(--color-text-muted)',
                                border: '1px solid var(--color-border)',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Baseline
                            </span>
                          )}
                        </div>
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.45', marginBottom: '1rem' }}>
                        {schema.description}
                      </p>

                      {/* Summary Metrics Box */}
                      <div
                        style={{
                          background: 'var(--color-canvas-bg)',
                          padding: '0.75rem 0.9rem',
                          borderRadius: 'var(--radius-small)',
                          marginBottom: '1rem',
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Active Records:</span>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                            {stats.count.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Primary Key:</span>
                          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                            {schema.primaryKey.join(' + ')}
                          </span>
                        </div>
                      </div>

                      {/* Attached CSV Files List (Displays each CSV separately with its own Delete & View button) */}
                      <div style={{ marginBottom: '1.1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            Attached CSV Files ({files.length > 0 ? files.length : 1}):
                          </span>
                          {files.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setDeletingCategory(cat)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-error)',
                                fontSize: '0.68rem',
                                cursor: 'pointer',
                                padding: 0,
                                fontWeight: 600
                              }}
                            >
                              Clear All
                            </button>
                          )}
                        </div>

                        {files.length === 0 ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-small)',
                              background: 'var(--color-canvas-bg)',
                              border: '1px dashed var(--color-border)',
                              fontSize: '0.75rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-muted)' }}>
                              <FileSpreadsheet size={14} />
                              <span>Built-in default ({cat}.csv)</span>
                            </div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', background: 'var(--color-border)', padding: '2px 6px', borderRadius: '4px' }}>
                              System Default
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            {files.map((file) => (
                              <div
                                key={file.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.5rem',
                                  padding: '8px 10px',
                                  borderRadius: 'var(--radius-small)',
                                  background: '#FFFFFF',
                                  border: '1px solid rgba(230, 138, 0, 0.25)',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                }}
                              >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      fontSize: '0.78rem',
                                      color: 'var(--color-text-primary)',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                    title={file.fileName}
                                  >
                                    {file.fileName}
                                  </div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'flex', gap: '6px', marginTop: '1px' }}>
                                    <span>{file.rowCount.toLocaleString()} rows</span>
                                    <span>•</span>
                                    <span>{(file.fileSize / 1024).toFixed(1)} KB</span>
                                  </div>
                                </div>

                                {/* Actions for this specific CSV file */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={() => openSingleFileViewer(file)}
                                    title={`View rows in ${file.fileName}`}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '5px',
                                      border: '1px solid var(--color-border)',
                                      background: 'var(--color-canvas-bg)',
                                      color: 'var(--color-text-primary)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 500
                                    }}
                                  >
                                    <Eye size={12} color="var(--color-accent)" />
                                    <span>View</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingFile(file)}
                                    title={`Delete ${file.fileName}`}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '5px',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      background: 'rgba(239, 68, 68, 0.06)',
                                      color: 'var(--color-error)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 500
                                    }}
                                  >
                                    <Trash2 size={12} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enhanced Action Buttons Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.4rem',
                        paddingTop: '0.9rem',
                        borderTop: '1px solid var(--color-border)'
                      }}
                    >
                      {/* View Button */}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => openActiveCategoryViewer(cat)}
                        style={{
                          fontSize: '0.78rem',
                          padding: '6px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                        title="Inspect combined table records"
                      >
                        <Eye size={13} color="var(--color-accent)" />
                        <span>{files.length > 1 ? 'View Combined' : 'View Data'}</span>
                      </button>

                      {/* Upload/Add Button */}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setTargetCategoryForSingleUpload(cat);
                          singleCategoryInputRef.current?.click();
                        }}
                        style={{
                          fontSize: '0.78rem',
                          padding: '6px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                        title={`Upload or add CSV file for ${schema.displayName}`}
                      >
                        <UploadCloud size={13} color="var(--color-accent)" />
                        <span>{files.length > 0 ? '+ Add CSV' : 'Upload CSV'}</span>
                      </button>

                      {/* Download Button */}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleExportCsv(cat)}
                        title={`Download active ${schema.displayName} CSV`}
                        style={{
                          fontSize: '0.78rem',
                          padding: '6px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-canvas-bg)',
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        <Download size={13} color="var(--color-accent)" />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Hidden file input for single-category upload button */}
      <input
        type="file"
        ref={singleCategoryInputRef}
        multiple
        accept=".csv,text/csv,text/plain,application/vnd.ms-excel,application/csv"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0 && targetCategoryForSingleUpload) {
            processFiles(e.target.files, targetCategoryForSingleUpload);
            e.target.value = '';
          }
        }}
      />

      {/* 5. Light Mode Top 10 Records Preview Modal */}
      {activeViewer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 14, 20, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1.5rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveViewer(null);
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              color: '#1E1C24',
              border: '1px solid #E2E4E9',
              borderRadius: 'var(--radius-large)',
              width: '100%',
              maxWidth: '1040px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              animation: 'fadeIn 0.15s ease-out',
              overflow: 'hidden'
            }}
          >
            {/* Light Mode Header */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid #EAECF0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8F9FC',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-small)',
                    background: 'rgba(230, 138, 0, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#E68A00'
                  }}
                >
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E1C24', margin: 0 }}>
                      {activeViewer.title}
                    </h3>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: activeViewer.isCustom ? 'rgba(39, 174, 96, 0.12)' : '#ECEEF3',
                        color: activeViewer.isCustom ? '#1E824C' : '#6E6D7A',
                        border: activeViewer.isCustom ? '1px solid rgba(39, 174, 96, 0.3)' : '1px solid #DADCDE',
                        fontWeight: 600
                      }}
                    >
                      {activeViewer.isCustom ? 'Custom Database' : 'Default Baseline'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6E6D7A', marginTop: '2px' }}>
                    Top 10 Records Preview • Total <strong style={{ color: '#1E1C24' }}>{activeViewer.rows.length.toLocaleString('en-IN')}</strong> records in file ({activeViewer.fileName})
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveViewer(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6E6D7A',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: 'var(--radius-small)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#1E1C24';
                  e.currentTarget.style.background = '#EAECF0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6E6D7A';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Light Mode Table Body - Strictly Top 10 Records or Empty State */}
            <div style={{ flex: 1, overflow: 'auto', background: '#FFFFFF', padding: 0 }}>
              {activeViewer.rows.length === 0 ? (
                <div style={{ padding: '4rem 1.5rem', textAlign: 'center', background: '#FFFFFF' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.08)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                      color: 'var(--color-error)'
                    }}
                  >
                    <AlertTriangle size={28} />
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1E1C24', marginBottom: '0.4rem' }}>
                    No Records Available for {activeViewer.title}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#6E6D7A', maxWidth: '420px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
                    This dataset currently contains 0 records because the CSV file is missing, empty, or removed. Upload a valid CSV file to view records.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const cat = activeViewer.category;
                      setActiveViewer(null);
                      setTargetCategoryForSingleUpload(cat);
                      singleCategoryInputRef.current?.click();
                    }}
                    style={{ fontSize: '0.82rem', padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <UploadCloud size={15} />
                    <span>Upload {activeViewer.title} CSV</span>
                  </button>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#F3F4F7', zIndex: 10 }}>
                    <tr>
                      <th style={{ width: '50px', padding: '12px 16px', color: '#475467', fontWeight: 600, borderBottom: '1px solid #EAECF0', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>#</th>
                      {activeViewer.columns.map((col) => (
                        <th
                          key={col}
                          style={{
                            padding: '12px 16px',
                            color: '#475467',
                            fontWeight: 600,
                            borderBottom: '1px solid #EAECF0',
                            textTransform: 'uppercase',
                            fontSize: '0.7rem',
                            letterSpacing: '0.05em',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeViewer.rows.slice(0, 10).map((row, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                        <tr
                          key={idx}
                          style={{
                            background: isEven ? '#FFFFFF' : '#FAFAFC',
                            transition: 'background 0.1s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(230, 138, 0, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = isEven ? '#FFFFFF' : '#FAFAFC';
                          }}
                        >
                          <td style={{ padding: '12px 16px', color: '#98A2B3', fontFamily: 'var(--font-mono)', borderBottom: '1px solid #EAECF0' }}>
                            {idx + 1}
                          </td>
                          {activeViewer.columns.map((col) => (
                            <td
                              key={col}
                              style={{
                                padding: '12px 16px',
                                color: '#1E1C24',
                                borderBottom: '1px solid #EAECF0',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {row[col] !== undefined && row[col] !== '' ? (
                                String(row[col])
                              ) : (
                                <span style={{ color: '#98A2B3' }}>—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Light Mode Footer */}
            <div
              style={{
                padding: '1rem 1.75rem',
                borderTop: '1px solid #EAECF0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8F9FC',
                flexShrink: 0
              }}
            >
              <div style={{ fontSize: '0.82rem', color: '#6E6D7A' }}>
                Displaying <strong>top {Math.min(10, activeViewer.rows.length)} preview records</strong> of {activeViewer.rows.length.toLocaleString('en-IN')} total rows
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveViewer(null)}
                style={{ fontSize: '0.82rem', padding: '7px 20px' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6a. Single File Delete Approval Modal (Clean Light Mode) */}
      {deletingFile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingFile(null);
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              color: '#1E1C24',
              border: '1px solid #EAECF0',
              borderRadius: 'var(--radius-large)',
              width: '100%',
              maxWidth: '490px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.2rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#FEE4E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D92D20',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E1C24', margin: 0 }}>
                  Delete CSV File
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#6E6D7A', marginTop: '2px' }}>
                  {CATEGORY_SCHEMAS[deletingFile.category]?.displayName} • {deletingFile.fileName}
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#FEF3F2',
                padding: '0.95rem 1.1rem',
                borderRadius: 'var(--radius-small)',
                border: '1px solid #FECDCA',
                marginBottom: '1.35rem',
                fontSize: '0.84rem',
                color: '#475467',
                lineHeight: '1.5'
              }}
            >
              Are you sure you want to delete the file <strong style={{ color: '#1E1C24' }}>{deletingFile.fileName}</strong> ({deletingFile.rowCount.toLocaleString()} rows)?
              <br /><br />
              <span style={{ color: '#B42318', fontWeight: 600 }}>Effect:</span> This specific file will be removed. If other CSV files exist for this category, they will remain active.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingFile(null)}
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveDeleteFile}
                style={{
                  background: '#D92D20',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: 'var(--radius-small)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                <Trash2 size={14} />
                <span>Delete File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Enhanced Delete Approval Confirmation Modal (Clean Light Mode) */}
      {deletingCategory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingCategory(null);
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              color: '#1E1C24',
              border: '1px solid #EAECF0',
              borderRadius: 'var(--radius-large)',
              width: '100%',
              maxWidth: '490px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.2rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#FEE4E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D92D20',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E1C24', margin: 0 }}>
                  Approve Dataset Deletion
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#6E6D7A', marginTop: '2px' }}>
                  {CATEGORY_SCHEMAS[deletingCategory].displayName}
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#FEF3F2',
                padding: '0.95rem 1.1rem',
                borderRadius: 'var(--radius-small)',
                border: '1px solid #FECDCA',
                marginBottom: '1.35rem',
                fontSize: '0.84rem',
                color: '#475467',
                lineHeight: '1.5'
              }}
            >
              Are you sure you want to delete the custom uploaded file for <strong style={{ color: '#1E1C24' }}>{CATEGORY_SCHEMAS[deletingCategory].displayName}</strong>?
              <br /><br />
              <span style={{ color: '#B42318', fontWeight: 600 }}>Effect:</span> This will permanently remove the custom dataset from browser IndexedDB and restore the factory baseline data.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingCategory(null)}
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveDelete}
                style={{
                  background: '#D92D20',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: 'var(--radius-small)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                <Trash2 size={14} />
                <span>Approve &amp; Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Reset All Confirmation Modal (Clean Light Mode) */}
      {isResetAllModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsResetAllModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              color: '#1E1C24',
              border: '1px solid #EAECF0',
              borderRadius: 'var(--radius-large)',
              width: '100%',
              maxWidth: '490px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.2rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#FEF0C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D97706',
                  flexShrink: 0
                }}
              >
                <RotateCcw size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E1C24', margin: 0 }}>
                  Reset All to Factory Defaults
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#6E6D7A', marginTop: '2px' }}>
                  Clear all custom IndexedDB datasets
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                padding: '0.95rem 1.1rem',
                borderRadius: 'var(--radius-small)',
                fontSize: '0.84rem',
                color: '#78350F',
                lineHeight: '1.5',
                marginBottom: '1.4rem'
              }}
            >
              This action will erase all custom uploaded CSV files across <strong>Retail Outlets, Monthly Billing, BDM Officers, and Visit Logs</strong>, restoring the clean baseline datasets.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsResetAllModalOpen(false)}
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApproveResetAll}
                style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px' }}
              >
                Confirm Factory Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
