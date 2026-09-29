'use client';

import React, { useState } from 'react';
import { FinancialSnapshot } from '@/types';
import { deleteSnapshotPermanently, getStoredUserRole } from '@/lib/datasets/datasetService';
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface DeleteDatasetDialogProps {
  isOpen: boolean;
  snapshot: FinancialSnapshot | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteDatasetDialog: React.FC<DeleteDatasetDialogProps> = ({
  isOpen,
  snapshot,
  onClose,
  onSuccess,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !snapshot) return null;

  const role = getStoredUserRole();
  const isAuthorizedToDelete = role === 'CFO' || role === 'Admin' || role === 'Finance Manager';

  const handleConfirmDelete = async () => {
    if (!isAuthorizedToDelete) {
      setErrorMsg('Access Denied: Only CFO or Finance Manager privileges are authorized to permanently purge datasets.');
      return;
    }

    if (confirmInput.trim().toUpperCase() !== 'DELETE') {
      setErrorMsg('Please type "DELETE" to confirm permanent purge.');
      return;
    }

    setDeleting(true);
    setErrorMsg(null);

    try {
      await deleteSnapshotPermanently(snapshot);
      setDeleting(false);
      setConfirmInput('');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Permanent Delete Error:', err);
      setErrorMsg(err.message || 'Failed to permanently delete dataset.');
      setDeleting(false);
    }
  };

  const fmtCurrency = (val: number) => {
    if (!val) return '₹0.00';
    return `₹${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5 text-white">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Confirm Permanent Purge</h3>
              <p className="text-xs text-stone-400">
                Irreversible destructive operation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dataset Summary Card */}
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-stone-400 uppercase font-bold text-[10px] tracking-wider">Excel File</span>
            <span className="font-mono text-orange-400 font-bold">{snapshot.fileName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400 uppercase font-bold text-[10px] tracking-wider">Target Module</span>
            <span className="font-bold text-white uppercase">{snapshot.module}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400 uppercase font-bold text-[10px] tracking-wider">Record Count</span>
            <span className="font-bold text-white">{snapshot.recordCount} Transactions</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400 uppercase font-bold text-[10px] tracking-wider">Financial Valuation</span>
            <span className="font-mono text-emerald-400 font-bold">{fmtCurrency(snapshot.grandTotalClosing || 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400 uppercase font-bold text-[10px] tracking-wider">Upload Timestamp</span>
            <span className="text-stone-300">{new Date(snapshot.uploadedAt).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Warning Notice */}
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>
            This action will permanently delete the snapshot metadata, original stored Excel file, and all <strong>{snapshot.recordCount} associated transaction rows</strong> using cascading deletion. This cannot be undone.
          </span>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider">
            Type <span className="text-rose-400 font-mono">DELETE</span> to confirm purge
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={e => setConfirmInput(e.target.value)}
            placeholder="Type DELETE..."
            className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs font-mono text-white placeholder-stone-600 focus:outline-none focus:border-rose-500"
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDelete}
            disabled={deleting || confirmInput.trim().toUpperCase() !== 'DELETE'}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-40 cursor-pointer shadow-lg shadow-rose-600/30"
          >
            {deleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Purging Dataset...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Permanently Delete Dataset</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
