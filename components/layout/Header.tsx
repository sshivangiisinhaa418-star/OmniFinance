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
  LogOut
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { downloadSampleTallyExcel } from '@/lib/sampleData/tallyGenerator';

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
  const [selectedCompany, setSelectedCompany] = useState<string>('Acme Enterprise Pvt Ltd');
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [companies, setCompanies] = useState<string[]>([
    'Acme Enterprise Pvt Ltd',
    'Tally Global Industries',
    'Vedic Traders Pvt Ltd'
  ]);
  const [newCompanyInput, setNewCompanyInput] = useState('');
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [lastUpdate] = useState<string>('22 Sep 2026, 03:15 PM');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  };

  const handlePresetFY = (fy: string) => {
    if (fy === 'FY26') {
      setFilters(prev => ({
        ...prev,
        financialYear: 'FY 2026-27',
        dateRange: { start: '2026-04-01', end: '2027-03-31' },
      }));
    } else if (fy === 'ALL') {
      setFilters(prev => ({
        ...prev,
        financialYear: 'All Time',
        dateRange: { start: '', end: '' },
      }));
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const handleAddCompany = () => {
    if (newCompanyInput.trim()) {
      const name = newCompanyInput.trim();
      if (!companies.includes(name)) {
        setCompanies(prev => [...prev, name]);
      }
      setSelectedCompany(name);
      setNewCompanyInput('');
      setShowAddCompany(false);
      setIsCompanyOpen(false);
    }
  };

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
                  onClick={() => {
                    setSelectedCompany(comp);
                    setIsCompanyOpen(false);
                  }}
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
        {/* Date Presets */}
        <div className="flex items-center bg-stone-100 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 rounded-xl p-1 text-xs">
          <Calendar className="w-3.5 h-3.5 text-stone-400 ml-2 mr-1" />
          <button
            onClick={() => handlePresetFY('FY26')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              filters.financialYear === 'FY 2026-27'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            FY 2026-27
          </button>
          <button
            onClick={() => handlePresetFY('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              filters.financialYear === 'All Time'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            All Data
          </button>
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
    </header>
  );
};
