'use client';

import React, { useState } from 'react';
import { FinancialSnapshot } from '@/types';
import { Calendar, ChevronDown, Clock, History, Check, FileSpreadsheet } from 'lucide-react';

interface SnapshotSelectorProps {
  moduleTitle: string;
  snapshots: FinancialSnapshot[];
  selectedSnapshotId: string | null;
  onSelectSnapshot: (snapshot: FinancialSnapshot) => void;
}

export const SnapshotSelector: React.FC<SnapshotSelectorProps> = ({
  moduleTitle,
  snapshots,
  selectedSnapshotId,
  onSelectSnapshot,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900/60 text-stone-500 text-xs font-semibold">
        <Clock className="w-3.5 h-3.5 text-stone-400" />
        <span>No Uploaded Snapshots</span>
      </div>
    );
  }

  const selectedSnapshot = snapshots.find(s => s.id === selectedSnapshotId) || snapshots[0];
  const isLatest = snapshots.length > 0 && selectedSnapshot.id === snapshots[0].id;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs font-extrabold shadow-sm hover:border-orange-500/40 hover:bg-stone-50 dark:hover:bg-stone-800/80 transition cursor-pointer"
      >
        <Calendar className="w-4 h-4 text-orange-600 dark:text-amber-400" />
        <div className="flex items-center gap-1.5">
          <span className="text-stone-500 font-medium">Snapshot:</span>
          <span>{formatDate(selectedSnapshot.uploadedAt)}</span>
          {isLatest && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold">
              Latest
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl z-50 overflow-hidden animate-fade-in divide-y divide-stone-100 dark:divide-stone-800">
            <div className="p-3 bg-stone-50 dark:bg-stone-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-stone-900 dark:text-white">
                  {moduleTitle} History
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                {snapshots.length} Snapshots
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/50">
              {snapshots.map((snap, idx) => {
                const isSelected = snap.id === selectedSnapshot.id;
                const isItemLatest = idx === 0;

                return (
                  <button
                    key={snap.id}
                    onClick={() => {
                      onSelectSnapshot(snap);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-3 transition flex items-start justify-between group cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500/10 dark:bg-orange-500/20'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">
                          {formatDate(snap.uploadedAt)}
                        </span>
                        {isItemLatest && (
                          <span className="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[9px] font-extrabold uppercase">
                            Latest
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                        <FileSpreadsheet className="w-3 h-3 shrink-0 text-stone-400" />
                        <span className="truncate max-w-[170px]">{snap.fileName}</span>
                      </div>

                      <div className="text-[10px] text-stone-400 font-mono">
                        {snap.recordCount} Records • Uploaded by {snap.uploadedBy}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
