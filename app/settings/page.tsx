'use client';

import React, { useState } from 'react';
import { Settings, Building, DollarSign, Shield, RefreshCw } from 'lucide-react';
import { clearAllData } from '@/lib/storage';

export default function SettingsPage() {
  const [currency, setCurrency] = useState('INR');
  const [cleared, setCleared] = useState(false);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all imported Tally financial data?')) {
      clearAllData();
      setCleared(true);
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          <span>System & Organization Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure financial year defaults, currency formatting, Supabase connection, and data preferences
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/80 glass-panel p-6 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Building className="w-4 h-4 text-blue-400" />
            <span>Organization Profile</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Company Name</label>
              <input
                type="text"
                defaultValue="Acme Enterprise Pvt Ltd"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">GSTIN / Tax ID</label>
              <input
                type="text"
                defaultValue="27AAACA12341Z5"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Financial Preferences</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Base Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Financial Year Standard</label>
              <select defaultValue="FY_APR_MAR" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                <option value="FY_APR_MAR">April 1 to March 31 (Indian Financial Year)</option>
                <option value="FY_JAN_DEC">January 1 to December 31 (Calendar Year)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" />
            <span>Danger Zone - Clear Application Data</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Permanently clear all locally stored Tally transactions, imports history, and cached metrics.
          </p>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow transition"
          >
            Clear All Imported Financial Data
          </button>
        </div>
      </div>
    </div>
  );
}
