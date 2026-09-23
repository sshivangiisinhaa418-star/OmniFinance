'use client';

import React from 'react';
import Link from 'next/link';
import { UploadCloud, FileSpreadsheet, ArrowRight, Download } from 'lucide-react';
import { downloadSampleTallyExcel } from '@/lib/sampleData/tallyGenerator';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onQuickUpload?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Financial Data Uploaded Yet',
  description = 'Upload your Tally-exported Excel file (.xlsx, .xls) to populate real-time financial KPIs, executive reports, aging analysis, and P&L statements.',
  onQuickUpload,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] p-8 bg-white dark:bg-stone-900/60 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-3xl glass-panel text-center animate-fade-in my-6 shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-6 shadow-xl shadow-orange-500/10">
        <FileSpreadsheet className="w-8 h-8" />
      </div>

      <h3 className="text-xl font-black text-stone-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm font-medium text-stone-700 dark:text-stone-300 max-w-md leading-relaxed mb-8">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        {onQuickUpload ? (
          <button
            onClick={onQuickUpload}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-600/25 transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Data For This Page</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <Link
            href="/import"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-600/25 transition"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Tally Excel File</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
};
