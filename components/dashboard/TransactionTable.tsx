'use client';

import React, { useState } from 'react';
import { FinancialTransaction } from '@/types';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface TransactionTableProps {
  transactions: FinancialTransaction[];
  title?: string;
  pageSize?: number;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  title = 'Financial Transactions Explorer',
  pageSize = 10,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = transactions.slice(startIndex, startIndex + pageSize);

  const exportToCSV = () => {
    if (!transactions.length) return;
    const headers = ['Date', 'Voucher No', 'Voucher Type', 'Party Name', 'Ledger', 'Amount', 'Tax', 'Total Amount', 'Status'];
    const rows = transactions.map(t => [
      t.date,
      `"${t.voucherNo}"`,
      `"${t.voucherType}"`,
      `"${t.partyName}"`,
      `"${t.ledgerName}"`,
      t.amount || 0,
      t.taxAmount || 0,
      t.totalAmount || 0,
      t.paymentStatus || 'unpaid',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_transactions_export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 glass-panel p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">{title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Showing {transactions.length} total records from imported Tally files
          </p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={!transactions.length}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition"
        >
          <Download className="w-3.5 h-3.5 text-blue-500" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Voucher No</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Party Name</th>
              <th className="py-3 px-4">Ledger</th>
              <th className="py-3 px-4 text-right">Subtotal</th>
              <th className="py-3 px-4 text-right">Tax</th>
              <th className="py-3 px-4 text-right">Total Amount</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  No transaction records found matching active filters.
                </td>
              </tr>
            ) : (
              paginatedData.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{t.date}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-200">{t.voucherNo}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {t.voucherType}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{t.partyName}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{t.ledgerName}</td>
                  <td className="py-3 px-4 text-right font-mono">₹{(t.amount || 0).toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-slate-400">₹{(t.taxAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{(t.totalAmount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.paymentStatus === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {t.paymentStatus || 'unpaid'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
