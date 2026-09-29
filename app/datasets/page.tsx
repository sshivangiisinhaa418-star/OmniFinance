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
import { DeleteDatasetDialog } from '@/components/datasets/DeleteDatasetDialog';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import {
  Database,
  Search,
  Filter,
  Eye,
  EyeOff,
  Archive,
  Download,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Layers,
  ShieldCheck,
  Globe,
  UploadCloud,
  Plus
} from 'lucide-react';

export default function DatasetsPage() {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<DatasetType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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

    try {
      if (selectedModule === 'all') {
        const modules: DatasetType[] = ['sales', 'purchases', 'receivables', 'payables', 'payments', 'receipts', 'inventory', 'tax'];
        const results = await Promise.all(modules.map(m => getSnapshotsForModule(m)));
        allSnaps = results.flat();
      } else {
        allSnaps = await getSnapshotsForModule(selectedModule as DatasetType);
      }

      // Deduplicate by ID if any overlap
      const map = new Map<string, FinancialSnapshot>();
      allSnaps.forEach(s => map.set(s.id, s));
      allSnaps = Array.from(map.values());

      allSnaps.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } catch (err) {
      console.error('Error fetching snapshots:', err);
    } finally {
      setSnapshots(allSnaps);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, [selectedModule]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStatusToggle = async (snap: FinancialSnapshot, targetStatus: 'active' | 'inactive' | 'archived') => {
    try {
      await updateSnapshotStatus(snap.id, targetStatus, { fileName: snap.fileName, module: snap.module });
      showToast(
        targetStatus === 'inactive'
          ? `Dataset "${snap.fileName}" hidden. Excluded from active dashboard calculations.`
          : targetStatus === 'archived'
          ? `Dataset "${snap.fileName}" archived.`
          : `Dataset "${snap.fileName}" restored! Re-included in active analytics.`
      );
      await fetchSnapshots();
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

  const filteredSnapshots = snapshots.filter(s => {
    if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchFile = s.fileName.toLowerCase().includes(q);
      const matchUser = (s.uploadedBy || '').toLowerCase().includes(q);
      const matchModule = (s.module || '').toLowerCase().includes(q);
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
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-orange-600 dark:text-orange-500" />
            <span>Excel Dataset History &amp; Lifecycle Management</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Centralized archive for inspecting, hiding/restoring, downloading, or permanently purging uploaded Excel files
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Privilege Level: {role}</span>
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 via-amber-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-600/20 transition cursor-pointer shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>+ Upload New Excel Dataset</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-400 uppercase">Total Datasets</div>
            <div className="text-2xl font-black text-stone-900 dark:text-white">{snapshots.length} Files</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-400 uppercase">Active Included</div>
            <div className="text-2xl font-black text-emerald-500">{activeCount} Datasets</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <EyeOff className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-400 uppercase">Hidden / Inactive</div>
            <div className="text-2xl font-black text-amber-500">{inactiveCount} Datasets</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-400 uppercase">Active Valuation</div>
            <div className="text-lg font-black text-stone-900 dark:text-white font-mono">{fmtCurrency(activeValuation)}</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Status Tabs */}
        <div className="flex items-center bg-stone-100 dark:bg-stone-950 p-1 rounded-xl text-xs font-bold w-full md:w-auto">
          {(['all', 'active', 'inactive', 'archived'] as const).map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-lg capitalize transition cursor-pointer ${
                selectedStatus === st
                  ? 'bg-orange-600 text-white shadow-sm font-extrabold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              {st === 'all' ? 'All Datasets' : st === 'inactive' ? 'Hidden' : st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-md">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search filename or uploader..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Module Selector */}
          <select
            value={selectedModule}
            onChange={e => setSelectedModule(e.target.value as any)}
            className="bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none focus:border-orange-500"
          >
            {MODULE_LIST.map(m => (
              <option key={m} value={m}>
                {m === 'all' ? 'All Modules' : m.toUpperCase()}
              </option>
            ))}
          </select>

          <button
            onClick={fetchSnapshots}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-orange-500 transition cursor-pointer shrink-0"
            title="Refresh Datasets List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Datasets Table Card */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-stone-400 space-y-3">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
            <p className="text-xs font-bold">Loading Excel Dataset Archives...</p>
          </div>
        ) : filteredSnapshots.length === 0 ? (
          <div className="p-16 text-center text-stone-400 space-y-4">
            <FileSpreadsheet className="w-12 h-12 text-stone-500 mx-auto" />
            <div>
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">No Datasets Found</p>
              <p className="text-xs text-stone-500 mt-1">
                No Excel files match the current module or status filter. Click below to upload your first dataset.
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload New Excel File</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-stone-100 dark:bg-stone-950 text-stone-600 dark:text-stone-400 font-bold uppercase tracking-wider text-[10px] border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="py-3.5 px-4">Dataset Excel File</th>
                  <th className="py-3.5 px-4">Module</th>
                  <th className="py-3.5 px-4">Uploaded At &amp; User</th>
                  <th className="py-3.5 px-4">Records</th>
                  <th className="py-3.5 px-4">Valuation</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Lifecycle Actions</th>
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
                        isInactive ? 'bg-amber-500/5' : isArchived ? 'bg-stone-950/40' : ''
                      }`}
                    >
                      {/* File Name */}
                      <td className="py-4 px-4 font-bold text-stone-900 dark:text-white max-w-[220px] truncate">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-orange-500 shrink-0" />
                          <span className="truncate" title={snap.fileName}>{snap.fileName}</span>
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono font-normal">ID: {snap.id}</div>
                      </td>

                      {/* Module Badge */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
                          {snap.module}
                        </span>
                      </td>

                      {/* Date & User */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-stone-800 dark:text-stone-200">
                          {new Date(snap.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-stone-400 truncate max-w-[140px]">
                          by {snap.uploadedBy || 'Executive User'}
                        </div>
                      </td>

                      {/* Record Count */}
                      <td className="py-4 px-4 font-bold text-stone-800 dark:text-stone-200">
                        {snap.recordCount} Rows
                      </td>

                      {/* Valuation */}
                      <td className="py-4 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {fmtCurrency(snap.grandTotalClosing || 0)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4">
                        {snap.status === 'active' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active</span>
                          </span>
                        )}
                        {snap.status === 'inactive' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <EyeOff className="w-3 h-3 text-amber-500" />
                            <span>Hidden</span>
                          </span>
                        )}
                        {snap.status === 'archived' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <Archive className="w-3 h-3 text-purple-500" />
                            <span>Archived</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Hide / Restore Toggle */}
                          {snap.status === 'active' ? (
                            <button
                              onClick={() => handleStatusToggle(snap, 'inactive')}
                              className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-amber-500/20 text-stone-700 dark:text-stone-300 hover:text-amber-500 font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Hide Dataset (Exclude from Analytics)"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Hide</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusToggle(snap, 'active')}
                              className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-emerald-500/20 text-stone-700 dark:text-stone-300 hover:text-emerald-500 font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Restore Dataset (Re-include in Analytics)"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                          )}

                          {/* Archive Toggle */}
                          {snap.status !== 'archived' && (
                            <button
                              onClick={() => handleStatusToggle(snap, 'archived')}
                              className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-purple-500/20 text-stone-600 dark:text-stone-300 hover:text-purple-500 transition cursor-pointer"
                              title="Archive Dataset"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                          {/* Download Original Excel Signed URL */}
                          <button
                            onClick={() => handleDownloadOriginal(snap)}
                            className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-orange-500/20 text-stone-600 dark:text-stone-300 hover:text-orange-500 transition cursor-pointer"
                            title="Download Original Excel File"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Permanent Purge Delete Button */}
                          <button
                            onClick={() => setSnapshotToDelete(snap)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition cursor-pointer"
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

      {/* Quick Upload Modal */}
      <QuickUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        defaultDatasetType={selectedModule === 'all' ? 'sales' : (selectedModule as DatasetType)}
        pageTitle="Excel Archive Manager"
        onImportSuccess={() => fetchSnapshots()}
      />

      {/* Security Permanent Deletion Modal */}
      <DeleteDatasetDialog
        isOpen={!!snapshotToDelete}
        snapshot={snapshotToDelete}
        onClose={() => setSnapshotToDelete(null)}
        onSuccess={async () => {
          showToast(`Dataset "${snapshotToDelete?.fileName}" permanently purged from database & storage.`);
          await fetchSnapshots();
        }}
      />
    </div>
  );
}
