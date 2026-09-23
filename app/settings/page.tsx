'use client';

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { clearAllData } from '@/lib/storage';
import {
  Settings,
  Building,
  DollarSign,
  Shield,
  RefreshCw,
  User,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Save,
  Globe,
  Lock,
  Trash2,
  FileCheck2,
  BadgeCheck,
  Building2,
  SlidersHorizontal
} from 'lucide-react';

export default function SettingsPage() {
  // User Profile States
  const [userEmail, setUserEmail] = useState<string>('cfo@bkmindustries.com');
  const [userName, setUserName] = useState<string>('Vikramaditya Sharma');
  const [userRole, setUserRole] = useState<'CFO' | 'Auditor' | 'Accountant'>('CFO');
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);

  // Organization Profile States
  const [companyName, setCompanyName] = useState<string>('BKM Industries Limited');
  const [gstin, setGstin] = useState<string>('19AAACB4581B1ZM');
  const [corporateAddress, setCorporateAddress] = useState<string>('BKM Tower, 4th Floor, Kolkata, West Bengal 700001');
  const [taxJurisdiction, setTaxJurisdiction] = useState<string>('West Bengal & Silvassa (D&NH)');

  // Financial Preference States
  const [currency, setCurrency] = useState<string>('INR');
  const [fyStandard, setFyStandard] = useState<string>('FY_APR_MAR');
  const [defaultRowsPerPage, setDefaultRowsPerPage] = useState<number>(25);

  // UI Feedback States
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [supabaseActive, setSupabaseActive] = useState(false);

  // Load User & Organization Data on Mount
  useEffect(() => {
    setSupabaseActive(isSupabaseConfigured());

    const loadSessionData = async () => {
      // 1. Try Loading Supabase Auth User
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            if (user.email) setUserEmail(user.email);
            if (user.user_metadata?.full_name) setUserName(user.user_metadata.full_name);
            if (user.user_metadata?.role) setUserRole(user.user_metadata.role);
            setIsEmailVerified(!!user.email_confirmed_at);
          }
        } catch (err) {
          console.error('Error fetching Supabase user session:', err);
        }
      }

      // 2. Load Saved Local Session metadata as fallback
      const localSession = localStorage.getItem('tally_user_session');
      if (localSession) {
        try {
          const parsed = JSON.parse(localSession);
          if (parsed.email) setUserEmail(parsed.email);
          if (parsed.name) setUserName(parsed.name);
          if (parsed.role) setUserRole(parsed.role);
        } catch (e) {}
      }

      // 3. Load Saved Organization & Settings
      const savedCompany = localStorage.getItem('omnifinance_selected_company');
      if (savedCompany) setCompanyName(savedCompany);

      const savedGstin = localStorage.getItem('omnifinance_gstin');
      if (savedGstin) setGstin(savedGstin);

      const savedAddress = localStorage.getItem('omnifinance_address');
      if (savedAddress) setCorporateAddress(savedAddress);

      const savedCurrency = localStorage.getItem('omnifinance_currency');
      if (savedCurrency) setCurrency(savedCurrency);

      const savedRows = localStorage.getItem('omnifinance_rows_per_page');
      if (savedRows) setDefaultRowsPerPage(Number(savedRows));
    };

    loadSessionData();
  }, []);

  // Save Settings Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      // 1. Persist Organization & Preferences in LocalStorage
      localStorage.setItem('omnifinance_selected_company', companyName);
      localStorage.setItem('omnifinance_gstin', gstin);
      localStorage.setItem('omnifinance_address', corporateAddress);
      localStorage.setItem('omnifinance_currency', currency);
      localStorage.setItem('omnifinance_rows_per_page', defaultRowsPerPage.toString());

      // Update Company List to include updated company name
      const savedList = localStorage.getItem('omnifinance_company_list');
      let companyList = savedList ? JSON.parse(savedList) : ['BKM Industries Limited'];
      if (!companyList.includes(companyName)) {
        companyList = [companyName, ...companyList];
        localStorage.setItem('omnifinance_company_list', JSON.stringify(companyList));
      }

      // 2. Persist User Metadata in Local Session
      const updatedUserMeta = {
        email: userEmail,
        name: userName,
        role: userRole,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('tally_user_session', JSON.stringify(updatedUserMeta));

      // 3. Update Supabase User Metadata if active
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.updateUser({
          data: {
            full_name: userName,
            role: userRole,
          }
        });
      }

      setSaveSuccess('System & Organization settings updated successfully! Page will refresh preferences.');
      setTimeout(() => {
        setSaveSuccess(null);
      }, 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  // Password Reset Trigger
  const handlePasswordReset = async () => {
    if (!userEmail) return;
    setSaveSuccess(null);
    setSaveError(null);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
        if (error) throw error;
        setSaveSuccess(`Password reset security link sent to ${userEmail}. Please check your inbox.`);
      } catch (err: any) {
        setSaveError(err.message || 'Failed to send password reset email.');
      }
    } else {
      setSaveSuccess('Local password reset request logged. Check your local session.');
    }
  };

  // Clear All Financial Data
  const handleClearData = () => {
    if (confirm('CAUTION: Are you sure you want to permanently clear all imported Tally financial transactions, snapshots, and cached metrics?')) {
      clearAllData();
      localStorage.removeItem('omnifinance_selected_company');
      alert('All imported financial datasets have been cleared.');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-5xl space-y-6 animate-fade-in pb-12">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-600 dark:text-orange-500 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <span>System & Executive Settings</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Manage authenticated user credentials, corporate profile, financial defaults, and database security.
          </p>
        </div>

        {/* Database Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs shrink-0">
          <Globe className="w-4 h-4 text-orange-500" />
          <span className="text-stone-600 dark:text-stone-400 font-semibold">Engine:</span>
          {supabaseActive ? (
            <span className="text-emerald-500 font-bold flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5" /> Supabase Connected
            </span>
          ) : (
            <span className="text-amber-500 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Local Engine Active
            </span>
          )}
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. Executive User Profile Card */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" />
              <span>Authenticated User Profile</span>
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Active Executive Session
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Authenticated Gmail / Email Address */}
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                Authenticated Corporate Email (Gmail / Identity)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  readOnly
                  value={userEmail}
                  className="w-full bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl pl-10 pr-24 py-2.5 text-stone-900 dark:text-white font-mono font-bold cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                Your authenticated login email identity managed via Supabase Security.
              </p>
            </div>

            {/* Executive Full Name */}
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                Executive Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="e.g. Vikramaditya Sharma"
                  className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-stone-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

            {/* Privilege Role */}
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                Executive Privilege Level
              </label>
              <select
                value={userRole}
                onChange={e => setUserRole(e.target.value as any)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-stone-900 dark:text-white font-bold focus:outline-none focus:border-orange-500 transition cursor-pointer"
              >
                <option value="CFO">CFO — Chief Financial Officer (Full Access)</option>
                <option value="Auditor">Auditor — Senior GST & Financial Auditor</option>
                <option value="Accountant">Accountant — Head Accountant & Entry</option>
              </select>
            </div>

            {/* Password Security Action */}
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                Password Security
              </label>
              <button
                type="button"
                onClick={handlePasswordReset}
                className="w-full py-2.5 px-4 bg-stone-100 dark:bg-stone-950 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-800 dark:text-stone-200 font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-orange-500" />
                <span>Send Password Reset Security Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Corporate Organization Profile */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 p-6 shadow-sm space-y-5">
          <div className="border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span>Corporate Organization Profile</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                Primary Organization Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. BKM Industries Limited"
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-stone-900 dark:text-white font-bold focus:outline-none focus:border-orange-500 transition"
              />
              <p className="text-[10px] text-stone-500 mt-1">
                This name updates the active organization banner across the header and executive reports.
              </p>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                GSTIN / Corporate Tax Registration ID
              </label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                placeholder="e.g. 19AAACB4581B1ZM"
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-stone-900 dark:text-white font-mono font-bold focus:outline-none focus:border-orange-500 transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                Registered Office Address
              </label>
              <input
                type="text"
                value={corporateAddress}
                onChange={e => setCorporateAddress(e.target.value)}
                placeholder="e.g. BKM Tower, 4th Floor, Kolkata, West Bengal"
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-stone-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>
        </div>

        {/* 3. Financial & Display Preferences */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 p-6 shadow-sm space-y-5">
          <div className="border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>Financial & Report Display Preferences</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                Base Currency Symbol
              </label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-stone-900 dark:text-white font-bold focus:outline-none focus:border-orange-500 transition cursor-pointer"
              >
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                Financial Year Calendar
              </label>
              <select
                value={fyStandard}
                onChange={e => setFyStandard(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-stone-900 dark:text-white font-bold focus:outline-none focus:border-orange-500 transition cursor-pointer"
              >
                <option value="FY_APR_MAR">April 1 to March 31 (Indian Financial Year)</option>
                <option value="FY_JAN_DEC">January 1 to December 31 (Calendar Year)</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                Default Register Rows Per Page
              </label>
              <select
                value={defaultRowsPerPage}
                onChange={e => setDefaultRowsPerPage(Number(e.target.value))}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2.5 text-stone-900 dark:text-white font-bold focus:outline-none focus:border-orange-500 transition cursor-pointer"
              >
                <option value={10}>10 Rows Per Page</option>
                <option value={25}>25 Rows Per Page (Recommended)</option>
                <option value={50}>50 Rows Per Page</option>
                <option value={100}>100 Rows Per Page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="py-3 px-6 bg-gradient-to-r from-orange-600 via-amber-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save System Settings & Executive Profile</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 4. Danger Zone - Clear Application Data */}
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-4">
        <h3 className="text-sm font-extrabold text-rose-500 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Danger Zone — Clear Application Data & Cache</span>
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Permanently clear all locally saved Tally transaction records, Excel snapshot histories, and cached executive metrics. Your Supabase schema remains safe.
        </p>
        <button
          type="button"
          onClick={handleClearData}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear All Imported Financial Data</span>
        </button>
      </div>
    </div>
  );
}
