'use client';

import React, { useState } from 'react';
import { GlobalFilterState } from '@/types';
import {
  Search,
  Calendar,
  Filter,
  Download,
  Building,
  CheckCircle,
  Sun,
  Moon,
  ChevronDown,
  Check,
  Plus,
  LogOut,
  Database,
  X,
  UploadCloud
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { downloadSampleTallyExcel } from '@/lib/sampleData/tallyGenerator';
import { DatasetHistoryModal } from '@/components/datasets/DatasetHistoryModal';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import pkg from '@/package.json';

import { getAvailableCompaniesFromDB } from '@/lib/storage';

interface HeaderProps {
  filters: GlobalFilterState;
  setFilters: React.Dispatch<React.SetStateAction<GlobalFilterState>>;
  collapsed: boolean;
  onOpenFilterDrawer: () => void;
  onDataRefreshed?: () => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export const Header: React.FC<HeaderProps> = ({
  filters,
  setFilters,
  collapsed,
  onOpenFilterDrawer,
  onDataRefreshed,
  theme,
  setTheme,
}) => {
  const DEFAULT_COMPANIES = [
    'BKM Industries Limited'
  ];

  const [selectedCompany, setSelectedCompany] = useState<string>('BKM Industries Limited');
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [companies, setCompanies] = useState<string[]>(DEFAULT_COMPANIES);
  const [newCompanyInput, setNewCompanyInput] = useState('');
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [lastUpdate] = useState<string>('22 Sep 2026, 03:15 PM');

  // Load saved company state on mount and sync with Supabase DB
  React.useEffect(() => {
    const savedCompany = localStorage.getItem('omnifinance_selected_company');
    const savedList = localStorage.getItem('omnifinance_company_list');
    
    let localList: string[] = DEFAULT_COMPANIES;
    if (savedList) {
      try {
        const parsed = JSON.parse(savedList);
        const legacyMock = ['Rajmahal Enterprise Pvt Ltd', 'Burnpur Engineering Works', 'Silvassa Synthetics Ltd', 'Vedic Traders & Logistics', 'Acme Enterprise Pvt Ltd', 'Tally Global Industries', 'Vedic Traders Pvt Ltd'];
        const filtered = parsed.filter((c: string) => !legacyMock.includes(c));
        if (Array.isArray(filtered) && filtered.length > 0) {
          localList = filtered;
        }
      } catch (e) {}
    }
    
    setCompanies(localList);
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    }

    // Also fetch DB companies from Supabase
    getAvailableCompaniesFromDB().then((dbCompanies) => {
      if (dbCompanies && dbCompanies.length > 0) {
        setCompanies(prev => {
          const merged = Array.from(new Set([...prev, ...dbCompanies]));
          localStorage.setItem('omnifinance_company_list', JSON.stringify(merged));
          return merged;
        });
      }
    });
  }, []);

  // Save selected company to localStorage
  const handleSelectCompany = (companyName: string) => {
    setSelectedCompany(companyName);
    localStorage.setItem('omnifinance_selected_company', companyName);
    setIsCompanyOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  };

  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

  const handlePresetFY = (fy: string) => {
    if (fy === 'ALL') {
      setFilters(prev => ({
        ...prev,
        financialYear: 'All Time',
        dateRange: { start: '', end: '' },
      }));
    } else if (fy === 'FY24') {
      setFilters(prev => ({
        ...prev,
        financialYear: 'FY 2024-25',
        dateRange: { start: '2024-04-01', end: '2025-03-31' },
      }));
    } else if (fy === 'FY25') {
      setFilters(prev => ({
        ...prev,
        financialYear: 'FY 2025-26',
        dateRange: { start: '2025-04-01', end: '2026-03-31' },
      }));
    } else if (fy === 'FY26') {
      setFilters(prev => ({
        ...prev,
        financialYear: 'FY 2026-27',
        dateRange: { start: '2026-04-01', end: '2027-03-31' },
      }));
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setFilters(prev => ({
      ...prev,
      financialYear: start && end ? `Custom (${start} to ${end})` : 'Custom Range',
      dateRange: { start, end },
    }));
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const handleAddCompany = () => {
    if (newCompanyInput.trim()) {
      const name = newCompanyInput.trim();
      let updatedList = companies;
      if (!companies.includes(name)) {
        updatedList = [...companies, name];
        setCompanies(updatedList);
        localStorage.setItem('omnifinance_company_list', JSON.stringify(updatedList));
      }
      setSelectedCompany(name);
      localStorage.setItem('omnifinance_selected_company', name);
      setNewCompanyInput('');
      setShowAddCompany(false);
      setIsCompanyOpen(false);
    }
  };

  const [isDatasetHistoryOpen, setIsDatasetHistoryOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 flex items-center justify-between px-6 transition-all duration-300 ${
        collapsed ? 'left-20' : 'left-64'
      }`}
    >
      {/* Search & Interactive Company Selector */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search party, voucher no, ledger, product..."
            value={filters.searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-stone-100 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-orange-500 transition"
          />
        </div>

        {/* Interactive Company Selector Dropdown */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setIsCompanyOpen(!isCompanyOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 hover:border-orange-500/50 rounded-xl text-xs text-stone-700 dark:text-stone-300 transition cursor-pointer"
          >
            <Building className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="font-bold truncate max-w-[140px]">{selectedCompany}</span>
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>

          {isCompanyOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-fade-in">
              <div className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider px-2.5 py-1">
                Active Organization
              </div>
              {companies.map(comp => (
                <button
                  key={comp}
                  onClick={() => handleSelectCompany(comp)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                    selectedCompany === comp
                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className="truncate">{comp}</span>
                  {selectedCompany === comp && <Check className="w-3.5 h-3.5 text-orange-500" />}
                </button>
              ))}

              <div className="border-t border-stone-100 dark:border-stone-800 pt-1 mt-1">
                {!showAddCompany ? (
                  <button
                    onClick={() => setShowAddCompany(true)}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Company</span>
                  </button>
                ) : (
                  <div className="p-1 space-y-2">
                    <input
                      type="text"
                      value={newCompanyInput}
                      onChange={e => setNewCompanyInput(e.target.value)}
                      placeholder="Company Name..."
                      className="w-full px-2 py-1 text-xs bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleAddCompany}
                        className="px-2.5 py-1 bg-orange-600 text-white rounded-lg text-[10px] font-bold"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowAddCompany(false)}
                        className="px-2 py-1 text-stone-500 text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls & Presets */}
      <div className="flex items-center gap-3">
        {/* Quick Upload Button (Visible on ALL pages) */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black rounded-xl shadow-md shadow-orange-600/20 transition cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          title="Upload Tally / Excel Data File"
        >
          <UploadCloud className="w-4 h-4 text-white shrink-0" />
          <span className="hidden sm:inline">Upload Excel</span>
        </button>

        {/* Dataset History Archive Button */}
        <button
          onClick={() => setIsDatasetHistoryOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600/10 hover:bg-orange-600/20 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-xl border border-orange-500/30 transition cursor-pointer"
          title="Open Excel Dataset Lifecycle Archive"
        >
          <Database className="w-3.5 h-3.5 text-orange-500" />
          <span className="hidden sm:inline">Excel Archive</span>
        </button>

        {/* Date Presets & Robust Year/Calendar Selector */}
        <div className="relative flex items-center bg-stone-100 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition cursor-pointer"
            title="Custom Date & Financial Year Calendar Picker"
          >
            <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          <button
            onClick={() => handlePresetFY('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filters.financialYear === 'All Time' || (!filters.dateRange.start && !filters.dateRange.end)
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            All Data
          </button>

          {/* Interactive Date Range Popover */}
          {isDatePopoverOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                <span className="text-xs font-black text-stone-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span>Calendar Range Selector</span>
                </span>
                <button
                  onClick={() => setIsDatePopoverOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    From (Start Date)
                  </label>
                  <input
                    type="date"
                    value={filters.dateRange.start || ''}
                    onChange={e => handleCustomDateChange(e.target.value, filters.dateRange.end || '')}
                    className="w-full px-3 py-1.5 text-xs bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    To (End Date)
                  </label>
                  <input
                    type="date"
                    value={filters.dateRange.end || ''}
                    onChange={e => handleCustomDateChange(filters.dateRange.start || '', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    handlePresetFY('ALL');
                    setIsDatePopoverOpen(false);
                  }}
                  className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-bold rounded-xl transition"
                >
                  Reset (All Data)
                </button>
                <button
                  onClick={() => setIsDatePopoverOpen(false)}
                  className="px-4 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 transition"
                >
                  Apply Range
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Filter Drawer Button */}
        <button
          onClick={onOpenFilterDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 transition cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5 text-orange-500" />
          <span>Filters</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl border border-stone-200 dark:border-stone-700 transition flex items-center justify-center cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-orange-600" />
          )}
        </button>

        {/* White Text Version Badge */}
        <div className="hidden sm:flex items-center px-2.5 py-1 bg-stone-900 dark:bg-stone-800 text-white border border-stone-700 rounded-xl text-xs font-black shadow-sm shrink-0">
          <span className="text-white tracking-wider">v{pkg.version}</span>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={async () => {
            if (isSupabaseConfigured() && supabase) {
              await supabase.auth.signOut();
            }
            localStorage.removeItem('tally_user_session');
            window.location.href = '/login';
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 transition cursor-pointer"
          title="Sign Out of Session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>

        {/* Data Refresh Status */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 border-l border-stone-200 dark:border-stone-800 pl-3">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          <span>Updated: {lastUpdate}</span>
        </div>
      </div>

      {/* Dataset History Lifecycle Archive Modal */}
      <DatasetHistoryModal
        isOpen={isDatasetHistoryOpen}
        onClose={() => setIsDatasetHistoryOpen(false)}
        onDataRefreshed={onDataRefreshed}
      />

      {/* Global Quick Upload Modal (Accessible on ALL pages) */}
      <QuickUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImportSuccess={() => {
          setIsUploadModalOpen(false);
          if (onDataRefreshed) onDataRefreshed();
          window.location.reload();
        }}
      />
    </header>
  );
};
