'use client';

import React, { useState } from 'react';
import { DatasetType, FinancialSnapshot } from '@/types';
import { parseExcelFile, ParsedWorkbookResult, transformSheetToTransactions } from '@/lib/import/excelParser';
import { parseAmount, parseBalanceAmount } from '@/lib/import/validator';
import { saveSnapshotWithTransactions } from '@/lib/storage';
import { TARGET_FIELDS } from '@/lib/import/columnMapper';
import { FileUploader } from './FileUploader';
import { X, UploadCloud, CheckCircle2, FileSpreadsheet, ArrowRight, Check, AlertCircle, Calendar, RefreshCw } from 'lucide-react';

interface QuickUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDatasetType?: DatasetType;
  onImportSuccess?: (snapshotId?: string) => void;
  pageTitle?: string;
}

export const QuickUploadModal: React.FC<QuickUploadModalProps> = ({
  isOpen,
  onClose,
  defaultDatasetType = 'sales',
  onImportSuccess,
  pageTitle = 'Current Report Page',
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'success'>('upload');
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedWorkbookResult | null>(null);
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('upload');
    setActiveFile(null);
    setParsedResult(null);
    setCustomMappings({});
    setImporting(false);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleMappingChange = (header: string, targetField: string) => {
    setCustomMappings(prev => ({ ...prev, [header]: targetField }));
  };

  const handleConfirmAndSaveSnapshot = async () => {
    if (!parsedResult || !activeFile) return;
    await handleWorkbookParsed(parsedResult, activeFile);
  };

  const handleWorkbookParsed = async (result: ParsedWorkbookResult, file: File) => {
    if (!result.sheets || result.sheets.length === 0) return;

    setActiveFile(file);
    setParsedResult(result);
    setImporting(true);

    try {
      const targetSheet = result.sheets[0];
      const datasetType = defaultDatasetType || targetSheet.datasetType;
      const importId = 'imp_' + Math.random().toString(36).substring(2, 9);
      const snapshotId = `snap_${datasetType}_${new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14)}`;

      // Build mappings using auto-mapped column target fields
      const mappings = targetSheet.columnMappings.map(m => ({
        excelHeader: m.excelHeader,
        targetField: m.targetField,
      }));

      const transformedTxns = transformSheetToTransactions(
        file,
        targetSheet.sheetName,
        targetSheet.rawRows,
        mappings,
        datasetType,
        importId
      );

      const isPayable = datasetType === 'payables' || datasetType === 'purchases';
      let grandTotalOpening = transformedTxns.reduce((sum, t) => sum + (t.openingBalance || 0), 0);
      let grandTotalDebit = transformedTxns.reduce((sum, t) => sum + (t.debit || 0), 0);
      let grandTotalCredit = transformedTxns.reduce((sum, t) => sum + (t.credit || 0), 0);
      let grandTotalClosing = transformedTxns.reduce((sum, t) => sum + (t.closingBalance || 0), 0);

      if (targetSheet.grandTotal) {
        const gt = targetSheet.grandTotal;
        if (gt['Opening Balance'] !== undefined && gt['Opening Balance'] !== '') {
          grandTotalOpening = parseBalanceAmount(gt['Opening Balance'], isPayable);
        }
        if (gt['Debit'] !== undefined && gt['Debit'] !== '') {
          grandTotalDebit = parseAmount(gt['Debit']);
        }
        if (gt['Credit'] !== undefined && gt['Credit'] !== '') {
          grandTotalCredit = parseAmount(gt['Credit']);
        }
        if (gt['Closing Balance'] !== undefined && gt['Closing Balance'] !== '') {
          grandTotalClosing = parseBalanceAmount(gt['Closing Balance'], isPayable);
        }
      }

      const newSnapshot: FinancialSnapshot = {
        id: snapshotId,
        module: datasetType,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'Finance User',
        recordCount: transformedTxns.length,
        status: 'active',
        grandTotalOpening,
        grandTotalDebit,
        grandTotalCredit,
        grandTotalClosing,
      };

      await saveSnapshotWithTransactions(newSnapshot, transformedTxns);

      setImporting(false);
      setStep('success');
      setSuccessMessage(`Direct Upload Complete! Processed ${transformedTxns.length} records into Supabase for "${file.name}".`);

      setTimeout(() => {
        handleClose();
        if (onImportSuccess) {
          onImportSuccess(snapshotId);
        }
      }, 1200);
    } catch (err: any) {
      console.error('Direct Snapshot Save Error:', err);
      setImporting(false);
      alert(`Upload Error: ${err.message || String(err)}`);
    }
  };

  const activeSheet = parsedResult?.sheets[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-orange-600 dark:text-orange-500" />
              <span>15-Day Snapshot Upload for {pageTitle}</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Target Module: <span className="font-bold text-orange-600 dark:text-orange-400 uppercase">{defaultDatasetType}</span> (Updates ONLY this module)
            </p>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {step === 'upload' && (
            <FileUploader onWorkbookParsed={handleWorkbookParsed} />
          )}

          {step === 'mapping' && activeSheet && activeFile && (
            <div className="space-y-5 animate-fade-in">
              {/* Snapshot Info Card */}
              <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-white">
                    <FileSpreadsheet className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span>File: {activeFile.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-500 dark:text-stone-400 text-[11px]">
                    <span>Sheet: <strong className="text-stone-700 dark:text-stone-300">{activeSheet.sheetName}</strong></span>
                    <span>•</span>
                    <span>Records: <strong className="text-stone-700 dark:text-stone-300">{activeSheet.totalRows} Rows</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold bg-white dark:bg-stone-900 px-3 py-1.5 rounded-xl border border-orange-500/20">
                  <Calendar className="w-4 h-4" />
                  <span>Snapshot Timestamp: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Column Mapping Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-orange-500" />
                    <span>Verify Excel Column Mapping</span>
                  </h4>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Adjust mappings if necessary before creating snapshot
                  </span>
                </div>

                <div className="rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-stone-100 dark:bg-stone-950 text-stone-700 dark:text-stone-300 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Excel Header</th>
                        <th className="py-2.5 px-4">Sample Cell Value</th>
                        <th className="py-2.5 px-4">Mapped Target Field</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                      {activeSheet.headers.map((header, idx) => {
                        const currentTarget = customMappings[header] || 'unmapped';
                        const sampleVal = activeSheet.sampleRows[0]?.[header] ?? '';

                        return (
                          <tr key={idx} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
                            <td className="py-2.5 px-4 font-bold text-stone-900 dark:text-white">
                              {header}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-stone-500 dark:text-stone-400 truncate max-w-[150px]">
                              {String(sampleVal)}
                            </td>
                            <td className="py-2.5 px-4">
                              <select
                                value={currentTarget}
                                onChange={e => handleMappingChange(header, e.target.value)}
                                className="w-full bg-stone-100 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                              >
                                <option value="unmapped">-- Skip / Unmapped --</option>
                                {TARGET_FIELDS.map(tf => (
                                  <option key={tf.key} value={tf.key}>
                                    {tf.label} {tf.required ? '*' : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  Back
                </button>

                <button
                  onClick={handleConfirmAndSaveSnapshot}
                  disabled={importing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Snapshot...</span>
                    </>
                  ) : (
                    <>
                      <span>Save New Snapshot</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="p-8 text-center space-y-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-fade-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
              <h4 className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                Snapshot Created Successfully!
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                {successMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
