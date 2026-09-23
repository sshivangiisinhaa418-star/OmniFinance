'use client';

import React from 'react';
import { GlobalFilterState } from '@/types';
import { X, RotateCcw, Filter } from 'lucide-react';

interface GlobalFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: GlobalFilterState;
  setFilters: React.Dispatch<React.SetStateAction<GlobalFilterState>>;
}

export const GlobalFiltersModal: React.FC<GlobalFiltersModalProps> = ({
  isOpen,
  onClose,
  filters,
  setFilters,
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    setFilters({
      dateRange: { start: '', end: '' },
      financialYear: 'All Time',
      quarter: 'All',
      month: 'All',
      party: '',
      ledger: '',
      voucherType: '',
      branch: '',
      searchQuery: '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 h-full p-6 flex flex-col justify-between shadow-2xl">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <h2 className="font-extrabold text-stone-900 dark:text-white text-base">Global Finance Filters</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Controls */}
          <div className="space-y-4 py-6">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-400 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value },
                  }))
                }
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-400 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value },
                  }))
                }
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-400 uppercase tracking-wider mb-1">
                Party / Customer / Vendor
              </label>
              <input
                type="text"
                placeholder="e.g. Reliance, Dell, Apex..."
                value={filters.party}
                onChange={e => setFilters(prev => ({ ...prev, party: e.target.value }))}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-400 uppercase tracking-wider mb-1">
                Voucher Type
              </label>
              <select
                value={filters.voucherType}
                onChange={e => setFilters(prev => ({ ...prev, voucherType: e.target.value }))}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="">All Voucher Types</option>
                <option value="Sales">Sales</option>
                <option value="Purchase">Purchase</option>
                <option value="Payment">Payment</option>
                <option value="Receipt">Receipt</option>
                <option value="Journal">Journal</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={handleReset}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-300 rounded-xl text-xs font-bold border border-stone-300 dark:border-stone-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-600/20 transition"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
