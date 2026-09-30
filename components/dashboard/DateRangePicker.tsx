'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, AlertCircle, X, RotateCcw, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface DateRangePickerProps {
  transactions: { date?: string; [key: string]: any }[];
  onDateRangeChange: (filteredTransactions: any[], startDate: string | null, endDate: string | null) => void;
  selectedStartDate?: string | null;
  selectedEndDate?: string | null;
}

// Helper function to normalize any date format into standard "YYYY-MM-DD"
export const normalizeToYYYYMMDD = (val: string | number | undefined | null): string | null => {
  if (val === undefined || val === null) return null;

  if (typeof val === 'number' || (typeof val === 'string' && /^\d{5}(\.\d+)?$/.test(val.trim()))) {
    const num = typeof val === 'number' ? val : parseFloat(val.trim());
    if (num > 30000 && num < 70000) {
      const excelEpoch = new Date(1899, 11, 30);
      const jsDate = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(jsDate.getTime())) {
        const y = jsDate.getFullYear();
        const m = String(jsDate.getMonth() + 1).padStart(2, '0');
        const d = String(jsDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  const tallyMatch = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{2,4})$/);
  if (tallyMatch) {
    const day = tallyMatch[1].padStart(2, '0');
    const monthStr = tallyMatch[2].substring(0, 3).toLowerCase();
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

  const numericMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (numericMatch) {
    const day = numericMatch[1].padStart(2, '0');
    const month = numericMatch[2].padStart(2, '0');
    const rawYear = numericMatch[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
};

// Format YYYY-MM-DD to user-friendly "DD MMM YYYY"
const formatDateDisplay = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parts[0];
  const m = parseInt(parts[1], 10) - 1;
  const d = parts[2];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${monthNames[m]} ${y}`;
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  transactions,
  onDateRangeChange,
  selectedStartDate,
  selectedEndDate,
}) => {
  const [activePreset, setActivePreset] = useState<'all' | 'first_half' | 'second_half' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>(selectedStartDate || '');
  const [endDate, setEndDate] = useState<string>(selectedEndDate || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Popover calendar state
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync state if parent passes controlled props or resets to null
  useEffect(() => {
    if (selectedStartDate === null && selectedEndDate === null) {
      setStartDate('');
      setEndDate('');
      setActivePreset('all');
      setToastMessage(null);
    }
  }, [selectedStartDate, selectedEndDate]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopoverOpen]);

  // Extract min and max dates available in the current transactions dataset
  const validDates = transactions
    .map(t => normalizeToYYYYMMDD(t.date))
    .filter((d): d is string => Boolean(d))
    .sort();

  const minAvailableDate = validDates.length > 0 ? validDates[0] : null;
  const maxAvailableDate = validDates.length > 0 ? validDates[validDates.length - 1] : null;

  // Initialize view year & month based on available dataset or current start/end date
  const openPopoverFor = (tab: 'start' | 'end') => {
    setActiveTab(tab);
    const targetDate = tab === 'start' ? startDate || maxAvailableDate || minAvailableDate : endDate || startDate || maxAvailableDate || minAvailableDate;
    if (targetDate) {
      const parts = targetDate.split('-');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
    setIsPopoverOpen(true);
  };

  // Function to apply date filtering
  const applyFilter = (start: string | null, end: string | null, presetName: typeof activePreset) => {
    setActivePreset(presetName);

    if (start && end && start > end) {
      setToastMessage('Invalid date range: Start Date cannot be after End Date.');
      onDateRangeChange([], start, end);
      return;
    }

    if (!start && !end) {
      setToastMessage(null);
      onDateRangeChange(transactions, null, null);
      return;
    }

    const filtered = transactions.filter(t => {
      const normDate = normalizeToYYYYMMDD(t.date);
      if (!normDate) return true;
      if (start && normDate < start) return false;
      if (end && normDate > end) return false;
      return true;
    });

    if (filtered.length === 0 && transactions.length > 0) {
      const minFmt = minAvailableDate
        ? new Date(minAvailableDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'N/A';
      const maxFmt = maxAvailableDate
        ? new Date(maxAvailableDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'N/A';
      setToastMessage(`No data available in this range. Available dataset range: ${minFmt} to ${maxFmt}`);
    } else {
      setToastMessage(null);
    }

    onDateRangeChange(filtered, start, end);
  };

  const handlePresetSelect = (preset: 'all' | 'first_half' | 'second_half') => {
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      applyFilter(null, null, 'all');
      return;
    }

    if (!maxAvailableDate && !minAvailableDate) return;

    const referenceDate = maxAvailableDate || minAvailableDate || '2026-08-01';
    const parts = referenceDate.split('-');
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

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    applyFilter(null, null, 'all');
  };

  // Calendar navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Day selection click in calendar matrix
  const handleDaySelect = (dayNum: number) => {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const selectedDateStr = `${viewYear}-${mStr}-${dStr}`;

    if (activeTab === 'start') {
      setStartDate(selectedDateStr);
      let newEnd = endDate;
      if (endDate && selectedDateStr > endDate) {
        newEnd = selectedDateStr;
        setEndDate(selectedDateStr);
      }
      applyFilter(selectedDateStr, newEnd || null, 'custom');
      setActiveTab('end');
    } else {
      setEndDate(selectedDateStr);
      let newStart = startDate;
      if (startDate && selectedDateStr < startDate) {
        newStart = selectedDateStr;
        setStartDate(selectedDateStr);
      }
      applyFilter(newStart || null, selectedDateStr, 'custom');
      setIsPopoverOpen(false);
    }
  };

  // Calendar rendering math
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  return (
    <div className="space-y-3 relative">
      {/* Toast Notification Popup if data is not available or date range is invalid */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-amber-500/20 rounded-lg transition cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Date Range Picker Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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

        {/* Visual Calendar Selector Triggers */}
        <div className="flex items-center gap-2 w-full md:w-auto text-xs shrink-0 relative">
          <button
            type="button"
            onClick={() => openPopoverFor('start')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition cursor-pointer shadow-xs ${
              startDate
                ? 'bg-orange-500/10 border-orange-500/50 text-orange-600 dark:text-orange-400 font-bold'
                : 'bg-stone-50 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-orange-500/50'
            }`}
          >
            <span className="text-stone-400 font-normal">From:</span>
            <span>{formatDateDisplay(startDate) || 'dd-mm-yyyy'}</span>
            <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0 ml-1" />
          </button>

          <button
            type="button"
            onClick={() => openPopoverFor('end')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition cursor-pointer shadow-xs ${
              endDate
                ? 'bg-orange-500/10 border-orange-500/50 text-orange-600 dark:text-orange-400 font-bold'
                : 'bg-stone-50 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-orange-500/50'
            }`}
          >
            <span className="text-stone-400 font-normal">To:</span>
            <span>{formatDateDisplay(endDate) || 'dd-mm-yyyy'}</span>
            <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0 ml-1" />
          </button>

          {(startDate || endDate) && (
            <button
              onClick={handleReset}
              className="p-1.5 text-stone-500 hover:text-orange-600 dark:text-stone-400 dark:hover:text-orange-400 bg-stone-100 dark:bg-stone-800 rounded-lg transition cursor-pointer"
              title="Reset date filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Interactive Calendar Popover Dropdown */}
          {isPopoverOpen && (
            <div
              ref={popoverRef}
              className="absolute right-0 top-full mt-2 z-50 w-72 p-3 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-2xl space-y-3 animate-fade-in"
            >
              {/* Tab Selector: From / To */}
              <div className="flex items-center p-1 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setActiveTab('start')}
                  className={`flex-1 py-1 rounded-lg transition cursor-pointer text-center ${
                    activeTab === 'start'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  From: {startDate ? formatDateDisplay(startDate) : 'Select'}
                </button>
                <button
                  onClick={() => setActiveTab('end')}
                  className={`flex-1 py-1 rounded-lg transition cursor-pointer text-center ${
                    activeTab === 'end'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  To: {endDate ? formatDateDisplay(endDate) : 'Select'}
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between px-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-stone-600 dark:text-stone-400 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-stone-900 dark:text-white">
                  {monthNames[viewMonth]} {viewYear}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-stone-600 dark:text-stone-400 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day Labels */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-stone-400 uppercase">
                {dayLabels.map(day => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              {/* Interactive Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty offset cells */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} />
                ))}

                {/* Days of month */}
                {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                  const d = idx + 1;
                  const mStr = String(viewMonth + 1).padStart(2, '0');
                  const dStr = String(d).padStart(2, '0');
                  const cellDate = `${viewYear}-${mStr}-${dStr}`;

                  const isStart = startDate === cellDate;
                  const isEnd = endDate === cellDate;
                  const isInRange = startDate && endDate && cellDate > startDate && cellDate < endDate;
                  const isAvailableInDataset = validDates.includes(cellDate);

                  return (
                    <button
                      key={d}
                      onClick={() => handleDaySelect(d)}
                      className={`h-7 w-7 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition cursor-pointer relative ${
                        isStart || isEnd
                          ? 'bg-orange-600 text-white font-bold shadow-md scale-105'
                          : isInRange
                          ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 font-semibold'
                          : 'text-stone-800 dark:text-stone-200 hover:bg-orange-500/10 hover:text-orange-600'
                      }`}
                    >
                      {d}
                      {isAvailableInDataset && !(isStart || isEnd) && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-orange-500/60" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Popover Footer Controls */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px]">
                <button
                  onClick={handleReset}
                  className="text-stone-500 hover:text-orange-600 dark:text-stone-400 dark:hover:text-orange-400 transition cursor-pointer"
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => setIsPopoverOpen(false)}
                  className="px-2.5 py-1 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg font-bold transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Reusable empty state component when no data exists in selected date range
export const NoDataInDateRangeCard: React.FC<{
  startDate?: string | null;
  endDate?: string | null;
  onReset: () => void;
}> = ({ startDate, endDate, onReset }) => {
  const formatNiceDate = (d?: string | null) => {
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime())
      ? d
      : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const startFmt = formatNiceDate(startDate);
  const endFmt = formatNiceDate(endDate);

  let rangeStr = 'the selected date range';
  if (startFmt && endFmt) {
    rangeStr = `${startFmt} to ${endFmt}`;
  } else if (startFmt) {
    rangeStr = `after ${startFmt}`;
  } else if (endFmt) {
    rangeStr = `before ${endFmt}`;
  }

  return (
    <div className="p-8 my-6 text-center bg-white dark:bg-stone-900 border border-amber-500/30 rounded-2xl shadow-sm space-y-3.5 animate-fade-in">
      <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
        <Calendar className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-stone-900 dark:text-white">
          No data available in this range
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
          No records were found for <span className="font-semibold text-amber-600 dark:text-amber-400">{rangeStr}</span>. Try picking another date range or click below to clear the date filter.
        </p>
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Show All Dates</span>
      </button>
    </div>
  );
};

