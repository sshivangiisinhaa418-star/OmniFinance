'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploader } from '@/components/import/FileUploader';
import { ColumnMappingModal } from '@/components/import/ColumnMappingModal';
import { ParsedWorkbookResult, transformSheetToTransactions } from '@/lib/import/excelParser';
import { saveTransactions, saveImportMetadata, addAuditLog, getStoredTransactions } from '@/lib/storage';
import { detectDuplicates } from '@/lib/import/deduplication';
import { DatasetType } from '@/types';
import { UploadCloud, CheckCircle2, FileSpreadsheet, ArrowRight, ShieldCheck } from 'lucide-react';
import { downloadSampleTallyExcel } from '@/lib/sampleData/tallyGenerator';

export default function ImportPage() {
  const router = useRouter();
  const [parsedWorkbook, setParsedWorkbook] = useState<ParsedWorkbookResult | null>(null);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const handleWorkbookParsed = (result: ParsedWorkbookResult, file: File) => {
    setParsedWorkbook(result);
    setActiveFile(file);
    if (result.sheets.length > 0) {
      setActiveSheetIndex(0);
    }
  };

  const handleConfirmImport = async (
    datasetType: DatasetType,
    updatedMappings: { excelHeader: string; targetField: string }[]
  ) => {
    if (!parsedWorkbook || activeSheetIndex === null || !activeFile) return;

    setImporting(true);
    const targetSheet = parsedWorkbook.sheets[activeSheetIndex];
    const importId = 'imp_' + Math.random().toString(36).substring(2, 9);

    // Transform ALL raw rows from the Excel sheet
    const transformed = transformSheetToTransactions(
      activeFile,
      targetSheet.sheetName,
      targetSheet.rawRows, // Complete raw rows!
      updatedMappings,
      datasetType,
      importId
    );

    const existingTxns = await getStoredTransactions();
    const { uniqueTxns, duplicateCount } = detectDuplicates(transformed, existingTxns);

    await saveTransactions(uniqueTxns);
    await saveImportMetadata({
      id: importId,
      filename: activeFile.name,
      fileSize: activeFile.size,
      datasetType,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Finance User',
      recordCount: targetSheet.totalRows,
      validCount: uniqueTxns.length,
      warningCount: duplicateCount,
      errorCount: 0,
      status: 'imported',
      organizationId: 'org_default',
    });

    addAuditLog({
      user: 'Finance User',
      action: 'Imported Excel File',
      dataset: datasetType.toUpperCase(),
      details: `Imported ${uniqueTxns.length} valid records from sheet "${targetSheet.sheetName}" (${duplicateCount} duplicates flagged)`,
      status: 'success',
    });

    setImporting(false);
    setParsedWorkbook(null);
    setActiveSheetIndex(null);
    setImportSuccess(`Successfully imported ${uniqueTxns.length} records into ${datasetType.toUpperCase()} dataset!`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-orange-600 dark:text-orange-500" />
          <span>Tally Excel Ingestion & Mapping Pipeline</span>
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          Upload TallyPrime Excel exports (.xlsx, .xls, .csv). Auto-detects sheets, normalizes columns, validates accounting balance, and updates all dashboards dynamically.
        </p>
      </div>

      {importSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-bold">{importSuccess}</span>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1 transition"
          >
            <span>View Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dropzone Upload Section */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 glass-panel p-6">
        <FileUploader onWorkbookParsed={handleWorkbookParsed} />
      </div>

      {/* Parsed Workbook Sheet Preview */}
      {parsedWorkbook && (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 glass-panel p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-orange-500" />
                <span>{parsedWorkbook.fileName}</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {(parsedWorkbook.fileSize / 1024).toFixed(1)} KB | Detected {parsedWorkbook.sheets.length} Sheets
              </p>
            </div>

            <button
              onClick={downloadSampleTallyExcel}
              className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-bold flex items-center gap-1"
            >
              <span>Download Sample Tally File</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parsedWorkbook.sheets.map((sheet, idx) => (
              <div
                key={sheet.sheetName}
                className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex flex-col justify-between space-y-3 hover:border-orange-500/50 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-stone-900 dark:text-white font-mono">{sheet.sheetName}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                      {sheet.datasetType}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    {sheet.totalRows} rows | {sheet.headers.length} columns
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-stone-200 dark:border-stone-800/60">
                  <button
                    onClick={() => setActiveSheetIndex(idx)}
                    className="w-full py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition flex items-center justify-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Review & Import ({sheet.totalRows} rows)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mapping Review Modal */}
      {parsedWorkbook && activeSheetIndex !== null && (
        <ColumnMappingModal
          sheet={parsedWorkbook.sheets[activeSheetIndex]}
          fileName={parsedWorkbook.fileName}
          onConfirmImport={handleConfirmImport}
          onCancel={() => setActiveSheetIndex(null)}
        />
      )}
    </div>
  );
}
