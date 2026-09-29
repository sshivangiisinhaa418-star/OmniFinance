'use client';

import React, { useState, useEffect } from 'react';
import { FinancialSnapshot, DatasetType } from '@/types';
import { getSnapshotsForModule } from '@/lib/storage';
import {
  updateSnapshotStatus,
  getSignedDownloadUrl,
  recordAuditLog,
  getStoredUserRole
} from '@/lib/datasets/datasetService';
import { DeleteDatasetDialog } from './DeleteDatasetDialog';
import {
  Database,
  X,
  Search,
  Filter,
  Eye,
  EyeOff,
  Archive,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  RefreshCw,
  Layers,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

interface DatasetHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultModule?: DatasetType | 'all';
  onDataRefreshed?: () => void;
}

export const DatasetHistoryModal: React.FC<DatasetHistoryModalProps> = ({
  isOpen,
  onClose,
  defaultModule = 'all',
  onDataRefreshed,
}) => {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<DatasetType | 'all'>(defaultModule);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Deletion modal state
  const [snapshotToDelete, setSnapshotToDelete] = useState<FinancialSnapshot | null>(null);

  const role = getStoredUserRole();

  const MODULE_LIST: (DatasetType | 'all')[] = [
    'all',
    'sales',
    'purchases',
    'receivables',
    'payables',
    'payments',
    'receipts',
    'inventory',
    'tax'
  ];

  const fetchSnapshots = async () => {
    setLoading(true);
    let allSnaps: FinancialSnapshot[] = [];

    if (selectedModule === 'all') {
      const modules: DatasetType[] = ['sales', 'purchases', 'receivables', 'payables', 'payments', 'receipts', 'inventory', 'tax'];
      const results = await Promise.all(modules.map(m => getSnapshotsForModule(m)));
      allSnaps = results.flat();
    } else {
      allSnaps = await getSnapshotsForModule(selectedModule as DatasetType);
    }

    // Sort newest first
    allSnaps.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    setSnapshots(allSnaps);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchSnapshots();
    }
  }, [isOpen, selectedModule]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStatusToggle = async (snap: FinancialSnapshot, targetStatus: 'active' | 'inactive' | 'archived') => {
    try {
      await updateSnapshotStatus(snap.id, targetStatus, { fileName: snap.fileName, module: snap.module });
      showToast(
        targetStatus === 'inactive'
          ? `Dataset "${snap.fileName}" hidden. Excluded from active dashboard calculations.`
          : targetStatus === 'archived'
          ? `Dataset "${snap.fileName}" moved to historical Archive.`
          : `Dataset "${snap.fileName}" restored! Re-included in active analytics.`
      );
      await fetchSnapshots();
      if (onDataRefreshed) onDataRefreshed();
    } catch (err: any) {
      alert(`Status Update Failed: ${err.message || String(err)}`);
    }
  };

  const handleDownloadOriginal = async (snap: FinancialSnapshot) => {
    if (!snap.storageBucket || !snap.storagePath) {
      alert('Original file storage link is not available for this snapshot record.');
      return;
    }

    try {
      const signedUrl = await getSignedDownloadUrl(snap.storageBucket, snap.storagePath);
      if (!signedUrl) {
        alert('Could not generate secure signed URL. Storage link may be unconfigured.');
        return;
      }

      await recordAuditLog({
        action: 'DOWNLOAD_DATASET',
        datasetId: snap.id,
        fileName: snap.fileName,
        module: snap.module,
        details: `Downloaded original Excel file "${snap.fileName}" via secure signed URL.`,
      });

      window.open(signedUrl, '_blank');
      showToast(`Downloading original Excel file "${snap.fileName}"...`);
    } catch (err: any) {
      alert(`Download Error: ${err.message || String(err)}`);
    }
  };

  // Filter snapshots
  const filteredSnapshots = snapshots.filter(s => {
    if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchFile = s.fileName.toLowerCase().includes(q);
      const matchUser = s.uploadedBy.toLowerCase().includes(q);
      const matchModule = s.module.toLowerCase().includes(q);
      if (!matchFile && !matchUser && !matchModule) return false;
    }
    return true;
  });

  const activeCount = snapshots.filter(s => s.status === 'active').length;
  const inactiveCount = snapshots.filter(s => s.status === 'inactive').length;
  const archivedCount = snapshots.filter(s => s.status === 'archived').length;
  const activeValuation = snapshots
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.grandTotalClosing || 0), 0);

  const fmtCurrency = (val: number) => {
    if (!val) return '₹0.00';
    return `₹${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-5xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-orange-600 dark:text-orange-500" />
              <span>Excel Dataset Lifecycle Archive &amp; Audit Engine</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Inspect, Hide/Restore, Archive or Permanently Purge uploaded Excel datasets
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="bg-stone-100 dark:bg-stone-950 p-4 border-b border-stone-200 dark:border-stone-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <Layers className="w-5 h-5 text-orange-500 shrink-0" />
            <div>
              <div className="text-[10px] text-stone-400 uppercase font-bold">Total Datasets</div>
              <div className="text-base font-black text-stone-900 dark:text-white">{snapshots.length} Files</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <div className="text-[10px] text-stone-400 uppercase font-bold">Active Included</div>
              <div className="text-base font-black text-emerald-500">{activeCount} Active</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <EyeOff className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <div className="text-[10px] text-stone-400 uppercase font-bold">Hidden / Inactive</div>
              <div className="text-base font-black text-amber-500">{inactiveCount} Hidden</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              <div className="text-[10px] text-stone-400 uppercase font-bold">Active Valuation</div>
              <div className="text-sm font-black text-stone-900 dark:text-white font-mono">{fmtCurrency(activeValuation)}</div>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="p-4 bg-stone-50/50 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center bg-stone-200 dark:bg-stone-950 p-1 rounded-2xl text-xs font-bold w-full md:w-auto">
            {(['all', 'active', 'inactive', 'archived'] as const).map(st => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-xl capitalize transition cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {st === 'all' ? 'All Datasets' : st === 'inactive' ? 'Hidden (Inactive)' : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-md">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dataset filename or uploader..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Module Select */}
            <select
              value={selectedModule}
              onChange={e => setSelectedModule(e.target.value as any)}
              className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none focus:border-orange-500"
            >
              {MODULE_LIST.map(m => (
                <option key={m} value={m}>
                  {m === 'all' ? 'All Modules' : m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Datasets Table */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-stone-400 space-y-3">
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
              <p className="text-xs font-semibold">Loading Excel Dataset Archives...</p>
            </div>
          ) : filteredSnapshots.length === 0 ? (
            <div className="p-12 text-center text-stone-400 space-y-2 bg-stone-50 dark:bg-stone-950/40 rounded-2xl border border-dashed border-stone-300 dark:border-stone-800">
              <FileSpreadsheet className="w-10 h-10 text-stone-500 mx-auto" />
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300">No Datasets Found</p>
              <p className="text-[11px] text-stone-500">
                No Excel datasets match the selected module or status filter.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-100 dark:bg-stone-950 text-stone-600 dark:text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Dataset Excel File</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Uploaded At &amp; User</th>
                    <th className="py-3 px-4">Records</th>
                    <th className="py-3 px-4">Grand Valuation</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {filteredSnapshots.map(snap => {
                    const isInactive = snap.status === 'inactive';
                    const isArchived = snap.status === 'archived';

                    return (
                      <tr
                        key={snap.id}
                        className={`hover:bg-stone-50 dark:hover:bg-stone-800/40 transition ${
                          isInactive ? 'opacity-70 bg-amber-500/5' : isArchived ? 'opacity-60 bg-stone-950/40' : ''
                        }`}
                      >
                        {/* File Name */}
                        <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-white max-w-[200px] truncate">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-orange-500 shrink-0" />
                            <span className="truncate" title={snap.fileName}>{snap.fileName}</span>
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono font-normal">ID: {snap.id}</div>
                        </td>

                        {/* Module */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
                            {snap.module}
                          </span>
                        </td>

                        {/* Date & User */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-stone-800 dark:text-stone-200">
                            {new Date(snap.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate max-w-[130px]">
                            by {snap.uploadedBy || 'Executive User'}
                          </div>
                        </td>

                        {/* Record Count */}
                        <td className="py-3.5 px-4 font-bold text-stone-800 dark:text-stone-200">
                          {snap.recordCount} Rows
                        </td>

                        {/* Valuation */}
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {fmtCurrency(snap.grandTotalClosing || 0)}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          {snap.status === 'active' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active</span>
                            </span>
                          )}
                          {snap.status === 'inactive' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <EyeOff className="w-3 h-3 text-amber-500" />
                              <span>Hidden</span>
                            </span>
                          )}
                          {snap.status === 'archived' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              <Archive className="w-3 h-3 text-purple-500" />
                              <span>Archived</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Hide / Restore Toggle */}
                            {snap.status === 'active' ? (
                              <button
                                onClick={() => handleStatusToggle(snap, 'inactive')}
                                className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-500/20 text-stone-600 dark:text-stone-300 hover:text-amber-500 transition cursor-pointer"
                                title="Hide Dataset (Exclude from Analytics)"
                              >
                                <EyeOff className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusToggle(snap, 'active')}
                                className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-500/20 text-stone-600 dark:text-stone-300 hover:text-emerald-500 transition cursor-pointer"
                                title="Restore Dataset (Re-include in Analytics)"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            {/* Archive Toggle */}
                            {snap.status !== 'archived' && (
                              <button
                                onClick={() => handleStatusToggle(snap, 'archived')}
                                className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-purple-500/20 text-stone-600 dark:text-stone-300 hover:text-purple-500 transition cursor-pointer"
                                title="Archive Dataset"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            )}

                            {/* Download Signed URL */}
                            <button
                              onClick={() => handleDownloadOriginal(snap)}
                              className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-orange-500/20 text-stone-600 dark:text-stone-300 hover:text-orange-500 transition cursor-pointer"
                              title="Download Original Excel File"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Permanent Purge Delete Button */}
                            <button
                              onClick={() => setSnapshotToDelete(snap)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition cursor-pointer"
                              title="Permanently Delete Dataset (Cascading Purge)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Logged in Privilege Level: <strong className="text-orange-500 uppercase">{role}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold rounded-xl transition cursor-pointer"
          >
            Close Archive
          </button>
        </div>

      </div>

      {/* Security Permanent Deletion Modal */}
      <DeleteDatasetDialog
        isOpen={!!snapshotToDelete}
        snapshot={snapshotToDelete}
        onClose={() => setSnapshotToDelete(null)}
        onSuccess={async () => {
          showToast(`Dataset "${snapshotToDelete?.fileName}" permanently purged from database & storage.`);
          await fetchSnapshots();
          if (onDataRefreshed) onDataRefreshed();
        }}
      />
    </div>
  );
};
