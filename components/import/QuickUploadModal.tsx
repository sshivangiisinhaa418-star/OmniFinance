'use client';

import React, { useState } from 'react';
import { DatasetType, FinancialSnapshot } from '@/types';
import { parseExcelFile, ParsedWorkbookResult, transformSheetToTransactions } from '@/lib/import/excelParser';
import { parseAmount, parseBalanceAmount } from '@/lib/import/validator';
import { saveSnapshotWithTransactions, getAvailableCompaniesFromDB } from '@/lib/storage';
import { TARGET_FIELDS } from '@/lib/import/columnMapper';
import { FileUploader } from './FileUploader';
import { X, UploadCloud, CheckCircle2, FileSpreadsheet, ArrowRight, Check, AlertCircle, Calendar, RefreshCw, Building } from 'lucide-react';

import { calculateFileHash, checkDuplicateFileHash, uploadOriginalExcelToStorage, getStoredUserEmail } from '@/lib/datasets/datasetService';

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
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('Initializing Upload...');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedModuleOverride, setSelectedModuleOverride] = useState<DatasetType | null>(null);
  const [mismatchData, setMismatchData] = useState<{
    detectedModule: DatasetType;
    expectedModule: DatasetType;
    file: File;
    result: ParsedWorkbookResult;
  } | null>(null);

  const targetCompany = 'BKM Industries Limited';

  if (!isOpen) return null;

  const resetState = () => {
    setStep('upload');
    setActiveFile(null);
    setParsedResult(null);
    setCustomMappings({});
    setImporting(false);
    setProgress(0);
    setProgressStatus('Initializing Upload...');
    setSuccessMessage(null);
    setSelectedModuleOverride(null);
    setMismatchData(null);
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
    await handleWorkbookParsed(parsedResult, activeFile, selectedModuleOverride || undefined);
  };

  const handleWorkbookParsed = async (
    result: ParsedWorkbookResult,
    file: File,
    overrideModule?: DatasetType
  ) => {
    if (!result.sheets || result.sheets.length === 0) return;

    const targetSheet = result.sheets[0];
    const detectedModule = targetSheet.datasetType;
    const expectedModule = defaultDatasetType || 'sales';

    // Smart Mismatch Detection: pause upload if file type differs from page expected module
    if (!overrideModule && detectedModule !== expectedModule && !mismatchData) {
      setMismatchData({
        detectedModule,
        expectedModule,
        file,
        result,
      });
      setSelectedModuleOverride(detectedModule);
      return;
    }

    setMismatchData(null);
    setActiveFile(file);
    setParsedResult(result);
    setImporting(true);
    setProgress(10);
    setProgressStatus('Inspecting Excel File & Hashing...');

    try {
      const datasetType = overrideModule || selectedModuleOverride || defaultDatasetType || targetSheet.datasetType;
      const importId = 'imp_' + Math.random().toString(36).substring(2, 9);
      const snapshotId = `snap_${datasetType}_${new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14)}`;

      // 1. Calculate file SHA-256 hash & check duplicate
      const fileHash = await calculateFileHash(file);
      setProgress(30);
      setProgressStatus('Checking Duplicate Hashes...');

      if (fileHash) {
        const duplicate = await checkDuplicateFileHash(fileHash, datasetType);
        if (duplicate) {
          const confirmProceed = window.confirm(
            `Notice: This exact Excel file "${file.name}" was already uploaded on ${new Date(duplicate.uploadedAt).toLocaleDateString()} by ${duplicate.uploadedBy}.\n\nDo you want to upload it again as a new version dataset?`
          );
          if (!confirmProceed) {
            setImporting(false);
            setProgress(0);
            return;
          }
        }
      }

      // 2. Upload raw Excel file to private Supabase Storage bucket 'finance-excel'
      setProgress(50);
      setProgressStatus('Uploading to Storage Bucket...');
      const storageResult = await uploadOriginalExcelToStorage(file, datasetType, snapshotId);

      // 3. Build mappings using auto-mapped column target fields
      setProgress(70);
      setProgressStatus('Parsing Column Schema & Rows...');
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

      const userEmail = getStoredUserEmail();

      const newSnapshot: FinancialSnapshot = {
        id: snapshotId,
        module: datasetType,
        companyName: targetCompany,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userEmail,
        recordCount: transformedTxns.length,
        status: 'active',
        grandTotalOpening,
        grandTotalDebit,
        grandTotalCredit,
        grandTotalClosing,
        storageBucket: storageResult?.bucket,
        storagePath: storageResult?.path,
        fileHash: fileHash || undefined,
      };

      setProgress(88);
      setProgressStatus(`Inserting ${transformedTxns.length} Records to Database...`);
      await saveSnapshotWithTransactions(newSnapshot, transformedTxns);

      setProgress(100);
      setProgressStatus('Upload & Database Sync Complete!');

      setImporting(false);
      setStep('success');
      setSuccessMessage(`Direct Upload Complete! Processed ${transformedTxns.length} records into Supabase for "${file.name}" [Module: ${datasetType.toUpperCase()}].`);

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
          {importing && (
            <div className="p-8 space-y-5 text-center animate-fade-in my-4">
              <div className="w-16 h-16 rounded-full bg-orange-500/10 text-orange-500 mx-auto flex items-center justify-center animate-spin">
                <RefreshCw className="w-8 h-8" />
              </div>
              <div className="space-y-3 max-w-md mx-auto">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white">
                  <span>{progressStatus || 'Uploading & Processing Dataset...'}</span>
                  <span className="text-orange-600 dark:text-orange-400 font-mono text-base font-black">{progress}%</span>
                </div>
                <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-3.5 overflow-hidden p-0.5 border border-stone-300 dark:border-stone-700 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-orange-600 via-amber-500 to-amber-400 h-full rounded-full transition-all duration-300 shadow-md shadow-orange-500/30"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  Saving original file hash, verifying columns, and writing records into Supabase...
                </p>
              </div>
            </div>
          )}

          {mismatchData && !importing && (
            <div className="p-6 space-y-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-fade-in my-2">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    Module Mismatch Detected
                  </h4>
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    The uploaded file <strong className="text-stone-900 dark:text-white">"{mismatchData.file.name}"</strong> appears to contain <span className="font-extrabold text-amber-600 dark:text-amber-400 uppercase">{mismatchData.detectedModule}</span> data, but you opened Quick Upload from the <span className="font-extrabold text-orange-600 dark:text-orange-400 uppercase">{mismatchData.expectedModule}</span> page.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-amber-500/20 space-y-3 text-xs">
                <span className="font-bold text-stone-900 dark:text-white block">
                  Select Target Destination Module:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedModuleOverride(mismatchData.detectedModule)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition ${
                      selectedModuleOverride === mismatchData.detectedModule
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <div>
                      <div className="font-extrabold uppercase">{mismatchData.detectedModule} Register</div>
                      <div className="text-[11px] opacity-80">Reroute to auto-detected module (Recommended)</div>
                    </div>
                    {selectedModuleOverride === mismatchData.detectedModule && <Check className="w-4 h-4 text-amber-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedModuleOverride(mismatchData.expectedModule)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition ${
                      selectedModuleOverride === mismatchData.expectedModule
                        ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold'
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <div>
                      <div className="font-extrabold uppercase">{mismatchData.expectedModule} Register</div>
                      <div className="text-[11px] opacity-80">Upload to current page anyway</div>
                    </div>
                    {selectedModuleOverride === mismatchData.expectedModule && <Check className="w-4 h-4 text-orange-500" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMismatchData(null);
                    resetState();
                  }}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  Cancel Upload
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (mismatchData && selectedModuleOverride) {
                      handleWorkbookParsed(mismatchData.result, mismatchData.file, selectedModuleOverride);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-amber-500/20 transition cursor-pointer"
                >
                  <span>Confirm & Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'upload' && !importing && !mismatchData && (
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
