'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseExcelFile, ParsedWorkbookResult } from '@/lib/import/excelParser';

interface FileUploaderProps {
  onWorkbookParsed: (result: ParsedWorkbookResult, file: File) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onWorkbookParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Unsupported file format. Please upload a valid Tally Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const parsed = await parseExcelFile(file);
      onWorkbookParsed(parsed, file);
    } catch (err: any) {
      console.error('Error parsing Excel workbook', err);
      setError('Failed to parse Excel file. Please ensure it is not password protected or corrupted.');
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 glass-panel'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-xl shadow-blue-500/10">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-base font-bold text-white mb-1">
          {loading ? 'Reading & Inspecting Tally Workbook...' : 'Drag & Drop Tally Excel File Here'}
        </h3>
        <p className="text-xs text-slate-400 mb-4 text-center max-w-sm">
          Supports Tally exports in <span className="text-blue-400 font-semibold">.xlsx</span>,{' '}
          <span className="text-blue-400 font-semibold">.xls</span>, or{' '}
          <span className="text-blue-400 font-semibold">.csv</span> formats.
        </p>

        <button
          disabled={loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/20 transition"
        >
          {loading ? 'Processing...' : 'Browse Computer'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
