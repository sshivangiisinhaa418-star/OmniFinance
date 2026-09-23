'use client';

import React, { useState, useEffect } from 'react';
import { getStoredTransactions } from '@/lib/storage';
import { FinancialTransaction } from '@/types';
import { calculateKPIs } from '@/lib/finance/calculations';
import { FinancialStatementView } from '@/components/statements/FinancialStatementView';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { FileText, UploadCloud } from 'lucide-react';

export default function StatementsPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pl' | 'bs' | 'tb'>('pl');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchTransactions = async () => {
    const txns = await getStoredTransactions();
    setTransactions(txns);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const kpis = calculateKPIs(transactions);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-600 dark:text-blue-400" />
            <span>Interactive Financial Statements</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Dynamic Balance Sheet, Profit & Loss Statement, and Trial Balance compiled from TallyPrime data
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/20 transition cursor-pointer self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Statement Vouchers</span>
        </button>
      </div>

      {/* Tab Controls */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab('pl')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'pl'
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          Profit & Loss Statement (P&L)
        </button>
        <button
          onClick={() => setActiveTab('bs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'bs'
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          Balance Sheet
        </button>
      </div>

      {!loading && transactions.length === 0 ? (
        <EmptyState
          title="No Financial Statement Data"
          description="Upload sales, purchase, and general ledger vouchers to generate automated Balance Sheets, P&L, and Trial Balance statements."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
      ) : (
        <FinancialStatementView kpis={kpis} type={activeTab} />
      )}

      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="sales"
        pageTitle="Balance Sheet & Financial Statements"
        onImportSuccess={fetchTransactions}
      />
    </div>
  );
}
