'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, X, Check, Filter } from 'lucide-react';

interface DateRangePickerProps {
  transactions: { date?: string }[];
  onDateRangeChange: (filteredTransactions: any[], startDate: string | null, endDate: string | null) => void;
}

// Helper function to normalize any Tally date format (e.g., "01-Aug-26", "1-Aug-2026", "2026-08-01") into standard "YYYY-MM-DD"
const normalizeToYYYYMMDD = (val: string | undefined): string | null => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // 1. If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  // 2. Handle Tally format: "01-Aug-26", "1-Aug-2026", "31-Aug-26", etc.
  const tallyMatch = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
  if (tallyMatch) {
    const day = tallyMatch[1].padStart(2, '0');
    const monthStr = tallyMatch[2].toLowerCase();
    const rawYear = tallyMatch[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;

    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = months[monthStr];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // 3. Handle DD/MM/YYYY or DD-MM-YYYY
  const numericMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (numericMatch) {
    const day = numericMatch[1].padStart(2, '0');
    const month = numericMatch[2].padStart(2, '0');
    const rawYear = numericMatch[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${month}-${day}`;
  }

  // 4. Native Date parse fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  transactions,
  onDateRangeChange,
}) => {
  const [activePreset, setActivePreset] = useState<'all' | 'first_half' | 'second_half' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Extract min and max dates available in the current transactions dataset (normalized YYYY-MM-DD)
  const validDates = transactions
    .map(t => normalizeToYYYYMMDD(t.date))
    .filter((d): d is string => Boolean(d))
    .sort();

  const minAvailableDate = validDates.length > 0 ? validDates[0] : null;
  const maxAvailableDate = validDates.length > 0 ? validDates[validDates.length - 1] : null;

  // Function to apply date filtering
  const applyFilter = (start: string | null, end: string | null, presetName: typeof activePreset) => {
    setActivePreset(presetName);

    if (!start && !end) {
      setToastMessage(null);
      onDateRangeChange(transactions, null, null);
      return;
    }

    const filtered = transactions.filter(t => {
      const normDate = normalizeToYYYYMMDD(t.date);
      if (!normDate) return true; // Keep if date unavailable
      if (start && normDate < start) return false;
      if (end && normDate > end) return false;
      return true;
    });

    if (filtered.length === 0 && transactions.length > 0) {
      const minFmt = minAvailableDate ? new Date(minAvailableDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
      const maxFmt = maxAvailableDate ? new Date(maxAvailableDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
      setToastMessage(`Data is not available for the given date range. Available range in uploaded dataset: ${minFmt} to ${maxFmt}`);
    } else {
      setToastMessage(null);
    }

    onDateRangeChange(filtered, start, end);
  };

  const handlePresetSelect = (preset: 'all' | 'first_half' | 'second_half') => {
    if (!minAvailableDate) return;

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      applyFilter(null, null, 'all');
      return;
    }

    // Determine year and month from normalized minAvailableDate (e.g., "2026-08-01")
    const parts = minAvailableDate.split('-');
    const year = parts[0];
    const month = parts[1];

    if (preset === 'first_half') {
      const s = `${year}-${month}-01`;
      const e = `${year}-${month}-15`;
      setStartDate(s);
      setEndDate(e);
      applyFilter(s, e, 'first_half');
    } else if (preset === 'second_half') {
      const s = `${year}-${month}-16`;
      const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
      const e = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(s);
      setEndDate(e);
      applyFilter(s, e, 'second_half');
    }
  };

  const handleCustomStartChange = (val: string) => {
    setStartDate(val);
    applyFilter(val || null, endDate || null, 'custom');
  };

  const handleCustomEndChange = (val: string) => {
    setEndDate(val);
    applyFilter(startDate || null, val || null, 'custom');
  };

  return (
    <div className="space-y-3">
      {/* Toast Notification Popup if data not available */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-amber-500/20 rounded-lg transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Date Range Picker Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span>Date Range:</span>
          </span>

          {/* Quick Presets */}
          <div className="flex items-center p-1 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs overflow-x-auto">
            <button
              onClick={() => handlePresetSelect('all')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                activePreset === 'all'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              All Dates
            </button>
            <button
              onClick={() => handlePresetSelect('first_half')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                activePreset === 'first_half'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              1st to 15th Days (1st Half)
            </button>
            <button
              onClick={() => handlePresetSelect('second_half')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                activePreset === 'second_half'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              16th to End (2nd Half)
            </button>
          </div>
        </div>

        {/* Custom Calendar Inputs */}
        <div className="flex items-center gap-2 w-full md:w-auto text-xs">
          <div className="flex items-center gap-1">
            <span className="text-stone-400 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => handleCustomStartChange(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-stone-400 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => handleCustomEndChange(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
