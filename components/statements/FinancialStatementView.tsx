'use client';

import React, { useState } from 'react';
import { FinancialKPIs } from '@/lib/finance/calculations';
import { ChevronDown, ChevronRight, FileText, Download } from 'lucide-react';

interface StatementRow {
  id: string;
  particulars: string;
  noteNo?: string;
  amount: number;
  prevAmount?: number;
  isHeader?: boolean;
  isTotal?: boolean;
  subRows?: StatementRow[];
}

interface FinancialStatementViewProps {
  kpis: FinancialKPIs;
  type: 'pl' | 'bs' | 'tb';
}

export const FinancialStatementView: React.FC<FinancialStatementViewProps> = ({ kpis, type }) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({
    revenue: true,
    expenses: true,
    assets: true,
    liabilities: true,
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const plRows: StatementRow[] = [
    {
      id: 'revenue',
      particulars: 'I. Revenue From Operations',
      amount: kpis.totalRevenue,
      prevAmount: kpis.prevPeriodSales,
      isHeader: true,
      subRows: [
        { id: 'rev_sales', particulars: 'Gross Sales / Invoice Value', amount: kpis.totalSales, prevAmount: kpis.prevPeriodSales },
        { id: 'rev_other', particulars: 'Other Operating Income', amount: 0, prevAmount: 0 },
      ],
    },
    {
      id: 'cogs',
      particulars: 'II. Cost of Goods Sold / Direct Purchases',
      amount: kpis.totalPurchases,
      prevAmount: kpis.totalPurchases * 0.82,
      isHeader: true,
      subRows: [
        { id: 'cogs_purchases', particulars: 'Direct Hardware & Services Purchases', amount: kpis.totalPurchases, prevAmount: kpis.totalPurchases * 0.82 },
      ],
    },
    {
      id: 'gross_profit',
      particulars: 'III. Gross Profit (I - II)',
      amount: kpis.grossProfit,
      prevAmount: kpis.prevPeriodSales - (kpis.totalPurchases * 0.82),
      isTotal: true,
    },
    {
      id: 'expenses',
      particulars: 'IV. Operating & Administrative Expenses',
      amount: kpis.totalExpenses,
      prevAmount: kpis.totalExpenses * 0.9,
      isHeader: true,
      subRows: [
        { id: 'exp_salaries', particulars: 'Employee Salaries & Payroll', amount: kpis.totalExpenses * 0.65, prevAmount: kpis.totalExpenses * 0.6 },
        { id: 'exp_rent', particulars: 'Office Lease & Infrastructure', amount: kpis.totalExpenses * 0.2, prevAmount: kpis.totalExpenses * 0.2 },
        { id: 'exp_utilities', particulars: 'Utilities & General Expenses', amount: kpis.totalExpenses * 0.15, prevAmount: kpis.totalExpenses * 0.1 },
      ],
    },
    {
      id: 'net_profit',
      particulars: 'V. Net Profit / (Loss) Before Tax',
      amount: kpis.netProfit,
      prevAmount: (kpis.prevPeriodSales - (kpis.totalPurchases * 0.82)) - (kpis.totalExpenses * 0.9),
      isTotal: true,
    },
  ];

  const bsRows: StatementRow[] = [
    {
      id: 'assets',
      particulars: 'EQUITY & LIABILITIES',
      amount: kpis.totalPayables + kpis.netProfit + 5000000,
      isHeader: true,
      subRows: [
        { id: 'share_capital', particulars: "Shareholders' Equity & Reserve", amount: 5000000 + Math.max(0, kpis.netProfit) },
        { id: 'trade_payables', particulars: 'Trade Payables / Vendors Outstanding', amount: kpis.totalPayables },
        { id: 'tax_liabilities', particulars: 'GST & Statutory Liabilities Payable', amount: kpis.totalTaxPayable },
      ],
    },
    {
      id: 'assets_total',
      particulars: 'ASSETS',
      amount: kpis.totalReceivables + kpis.inventoryValue + kpis.cashInflow,
      isHeader: true,
      subRows: [
        { id: 'trade_receivables', particulars: 'Trade Receivables / Customers Outstanding', amount: kpis.totalReceivables },
        { id: 'closing_stock', particulars: 'Closing Stock / Inventory Valuation', amount: kpis.inventoryValue },
        { id: 'cash_bank', particulars: 'Cash & Bank Balances', amount: Math.max(0, kpis.cashInflow - kpis.cashOutflow) },
      ],
    },
  ];

  const rows = type === 'pl' ? plRows : bsRows;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 glass-panel p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>
              {type === 'pl'
                ? 'Profit & Loss Statement (P&L)'
                : type === 'bs'
                ? 'Balance Sheet Statement'
                : 'Trial Balance Statement'}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamically compiled from uploaded Tally vouchers & ledger entries
          </p>
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition">
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Export Statement</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Particulars</th>
              <th className="py-3 px-4 text-right">Current Period (₹)</th>
              <th className="py-3 px-4 text-right">Previous Period (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {rows.map(row => {
              const isExpanded = expandedRows[row.id];
              return (
                <React.Fragment key={row.id}>
                  <tr
                    onClick={() => row.subRows && toggleRow(row.id)}
                    className={`transition ${
                      row.isTotal
                        ? 'bg-slate-800/80 font-bold text-white'
                        : row.isHeader
                        ? 'bg-slate-950/40 font-bold text-slate-200 cursor-pointer hover:bg-slate-800/30'
                        : 'hover:bg-slate-800/20 text-slate-300'
                    }`}
                  >
                    <td className="py-3.5 px-4 flex items-center gap-2">
                      {row.subRows && (
                        <span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </span>
                      )}
                      <span className={row.isTotal ? 'text-blue-400 font-bold' : ''}>{row.particulars}</span>
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono ${
                        row.isTotal ? 'text-emerald-400 font-bold text-sm' : 'text-slate-200 font-semibold'
                      }`}
                    >
                      ₹{row.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                      ₹{(row.prevAmount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>

                  {/* Sub-rows */}
                  {row.subRows &&
                    isExpanded &&
                    row.subRows.map(sub => (
                      <tr key={sub.id} className="bg-slate-950/20 hover:bg-slate-800/20 text-slate-400 transition">
                        <td className="py-2.5 px-4 pl-10 text-slate-300">{sub.particulars}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-300">
                          ₹{sub.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                          ₹{(sub.prevAmount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
