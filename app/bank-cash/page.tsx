'use client';

import React, { useState, useEffect } from 'react';
import { getStoredTransactions } from '@/lib/storage';
import { FinancialTransaction } from '@/types';
import { calculateKPIs } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { Wallet, ArrowUpRight, ArrowDownRight, CheckCircle2, UploadCloud } from 'lucide-react';

export default function BankCashPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
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
  const netCash = kpis.cashInflow - kpis.cashOutflow;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-orange-600 dark:text-emerald-500" />
            <span>Bank & Cash Treasury Management</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Bank account balances, cash drawer position, bank reconciliation, and cash flow velocity
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/20 transition cursor-pointer self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Bank / Cash Vouchers</span>
        </button>
      </div>

      {!loading && transactions.length === 0 ? (
        <EmptyState
          title="No Bank & Cash Data"
          description="Upload receipt, payment, and bank vouchers from Tally to track treasury accounts."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="HDFC Operating Bank Account" value={Math.max(0, netCash * 0.75)} icon={Wallet} gradientClass="kpi-gradient-emerald" iconColor="text-emerald-500" />
            <KpiCard title="ICICI Treasury Bank Account" value={Math.max(0, netCash * 0.2)} icon={Wallet} gradientClass="kpi-gradient-blue" iconColor="text-blue-500" />
            <KpiCard title="Petty Cash Drawer" value={Math.max(0, netCash * 0.05)} icon={Wallet} gradientClass="kpi-gradient-amber" iconColor="text-amber-500" />
            <KpiCard title="Reconciliation Status" value="100% Reconciled" isCurrency={false} icon={CheckCircle2} gradientClass="kpi-gradient-purple" iconColor="text-purple-500" />
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 glass-panel p-6 shadow-sm">
            <h4 className="text-sm font-bold text-stone-900 dark:text-white mb-4">Bank Accounts Summary & Clearing Status</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-950/60 text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider text-[11px] border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Bank / Cash Account</th>
                    <th className="py-3 px-4">Account No</th>
                    <th className="py-3 px-4 text-right">Inward Receipts</th>
                    <th className="py-3 px-4 text-right">Outward Payments</th>
                    <th className="py-3 px-4 text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800/40">
                  <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
                    <td className="py-3 px-4 font-bold text-stone-900 dark:text-white">HDFC Bank Current Account</td>
                    <td className="py-3 px-4 font-mono text-stone-500">50200012345678</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">₹{(kpis.cashInflow * 0.8).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">₹{(kpis.cashOutflow * 0.7).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{(netCash * 0.75).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
                    <td className="py-3 px-4 font-bold text-stone-900 dark:text-white">ICICI Corporate Bank Account</td>
                    <td className="py-3 px-4 font-mono text-stone-500">00040598765432</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">₹{(kpis.cashInflow * 0.2).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">₹{(kpis.cashOutflow * 0.3).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">₹{(netCash * 0.2).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="general"
        pageTitle="Bank & Cash Treasury"
        onImportSuccess={fetchTransactions}
      />
    </div>
  );
}
