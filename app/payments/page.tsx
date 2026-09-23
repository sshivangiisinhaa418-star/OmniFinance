'use client';

import React, { useState, useEffect } from 'react';
import { getSnapshotsForModule, getSnapshotTransactions } from '@/lib/storage';
import { FinancialTransaction, FinancialSnapshot } from '@/types';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { SnapshotSelector } from '@/components/dashboard/SnapshotSelector';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import {
  CreditCard,
  UploadCloud,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Receipt
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line
} from 'recharts';

export default function PaymentsPage() {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [dateFilteredTxns, setDateFilteredTxns] = useState<FinancialTransaction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const pageSize = 10;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const loadData = async (targetSnapshotId?: string) => {
    setLoading(true);
    const snaps = await getSnapshotsForModule('payments');
    setSnapshots(snaps);

    const activeId = targetSnapshotId || selectedSnapshotId || (snaps.length > 0 ? snaps[0].id : null);
    setSelectedSnapshotId(activeId);

    if (activeId) {
      const txns = await getSnapshotTransactions(activeId, 'payments');
      setTransactions(txns);
    } else {
      setTransactions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectSnapshot = (snap: FinancialSnapshot) => {
    setSelectedSnapshotId(snap.id);
    setCurrentPage(1);
    setDateFilteredTxns(null);
    loadData(snap.id);
  };

  const activeTxns = dateFilteredTxns ?? transactions;

  // Search filter
  const filteredTxns = activeTxns.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.partyName?.toLowerCase().includes(q) ||
      t.voucherNo?.toLowerCase().includes(q) ||
      t.voucherType?.toLowerCase().includes(q) ||
      t.date?.toLowerCase().includes(q)
    );
  });

  // Sort logic
  const sortedTxns = [...filteredTxns].sort((a: any, b: any) => {
    let valA = a[sortField] ?? 0;
    let valB = b[sortField] ?? 0;
    if (typeof valA === 'string') {
      valA = (valA as string).toLowerCase();
      valB = (valB as string).toLowerCase();
    }
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedTxns.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTxns = sortedTxns.slice(startIndex, startIndex + pageSize);

  // Core Math Calculations
  const totalDebitDisbursed = activeTxns.reduce((s, t) => s + (t.debit || t.amount || 0), 0);
  const totalCreditAmount = activeTxns.reduce((s, t) => s + (t.credit || 0), 0);
  
  const debitAmounts = activeTxns.map(t => t.debit || t.amount || 0).filter(a => a > 0);
  const maxPayment = debitAmounts.length > 0 ? Math.max(...debitAmounts) : 0;
  const avgPayment = debitAmounts.length > 0 ? totalDebitDisbursed / debitAmounts.length : 0;

  // Payee distribution aggregation for Donut Chart
  const payeeMap = new Map<string, number>();
  activeTxns.forEach(t => {
    const payee = t.partyName || 'Cash Payment';
    const amt = t.debit || t.amount || 0;
    payeeMap.set(payee, (payeeMap.get(payee) || 0) + amt);
  });

  const topPayeesData = Array.from(payeeMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const pieColors = ['#ea580c', '#f59e0b', '#10b981', '#6366f1', '#a855f7'];

  // Monthly trends calculation
  const monthMap = new Map<string, number>();
  activeTxns.forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    if (isNaN(d.getTime())) return;
    const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    monthMap.set(key, (monthMap.get(key) || 0) + (t.debit || t.amount || 0));
  });

  const monthlyTrends = Array.from(monthMap.entries()).map(([month, total]) => ({ month, total }));

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0.00';
    return `₹${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportPaymentsCSV = () => {
    if (!filteredTxns.length) return;
    const headers = ['Date', 'Particulars', 'Voucher Type', 'Voucher No.', 'Debit Amount', 'Credit Amount'];
    const rows = filteredTxns.map(t => [
      t.date || '',
      `"${(t.partyName || '').replace(/"/g, '""')}"`,
      `"${t.voucherType || 'Payment'}"`,
      `"${t.voucherNo || ''}"`,
      t.debit || t.amount || 0,
      t.credit || 0,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payment_register_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!loading && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="No Payment Register Data"
          description="Upload a Tally Payment Register Excel export to analyze cash/bank payment disbursements, top payees, and payment voucher records."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
        <QuickUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          defaultDatasetType="payments"
          pageTitle="Payment Register"
          onImportSuccess={(newSnapId) => loadData(newSnapId)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-500" />
            <span>Payment Register Board</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Real-time Cash &amp; Bank Payment Vouchers Audit (Date, Particulars &amp; Debit Amounts)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SnapshotSelector
            moduleTitle="Payment Register"
            snapshots={snapshots}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={handleSelectSnapshot}
          />

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 transition self-start md:self-auto shrink-0 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Payment Excel</span>
          </button>
        </div>
      </div>

      {/* Date Range Calendar Filter with 15-Day Presets & Out-of-Range Alerts */}
      <DateRangePicker
        transactions={transactions}
        onDateRangeChange={(filtered) => setDateFilteredTxns(filtered)}
      />

      {/* SECTION 1: EXECUTIVE KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Payments Disbursed"
          value={formatCurrency(totalDebitDisbursed)}
          isCurrency={false}
          icon={DollarSign}
          gradientClass="kpi-gradient-orange"
          iconColor="text-orange-500"
        />
        <KpiCard
          title="Max Single Payment"
          value={formatCurrency(maxPayment)}
          isCurrency={false}
          icon={ArrowUpRight}
          gradientClass="kpi-gradient-emerald"
          iconColor="text-emerald-500"
        />
        <KpiCard
          title="Average Payment Amount"
          value={formatCurrency(avgPayment)}
          isCurrency={false}
          icon={TrendingUp}
          gradientClass="kpi-gradient-blue"
          iconColor="text-blue-500"
        />
        <KpiCard
          title="Total Payment Vouchers"
          value={activeTxns.length}
          isCurrency={false}
          icon={Receipt}
          gradientClass="kpi-gradient-purple"
          iconColor="text-purple-500"
        />
      </div>

      {/* SECTION 2: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Monthly Payment Disbursement Trend" subtitle="🟠 Solid Orange Line = Total Debit Outflow per month">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} />
                <XAxis dataKey="month" stroke="#78716c" fontSize={11} />
                <YAxis stroke="#78716c" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} labelStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Line type="monotone" dataKey="total" name="Debit Disbursed" stroke="#ea580c" strokeWidth={3} dot={{ r: 5, fill: '#ea580c' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={(value) => <span className="text-stone-700 dark:text-stone-300 font-bold text-[11px]">{value}</span>} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div>
          <ChartCard title="Top Payees Share" subtitle="Pie Slices = % Share of Total Payment Outflow for Top 5 Particulars">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={topPayeesData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="name">
                  {topPayeesData.map((_, idx) => (
                    <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} labelStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={(value) => <span className="text-stone-700 dark:text-stone-300 font-bold text-[11px]">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* SECTION 3: TABLE */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl overflow-hidden">
        {/* Table Control Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50/50 dark:bg-stone-950/40">
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white tracking-wide flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-500" />
              <span>Payment Register Transactions</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Showing {filteredTxns.length} records parsed from uploaded Tally Payment Register Excel
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search Particulars, Voucher No..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>

            <button
              onClick={exportPaymentsCSV}
              disabled={!filteredTxns.length}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700 dark:text-stone-300 border-collapse whitespace-nowrap">
            <thead className="bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-200 font-bold text-[11px] border-b border-stone-200 dark:border-stone-800 uppercase tracking-wider sticky top-0 z-10 shadow-sm select-none">
              <tr>
                <th onClick={() => handleSort('date')} className="py-3 px-4 border-r border-stone-200 dark:border-stone-800 cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1"><span>Date</span>{sortField === 'date' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('partyName')} className="py-3 px-4 border-r border-stone-200 dark:border-stone-800 min-w-[200px] cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1"><span>Particulars</span>{sortField === 'partyName' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('voucherType')} className="py-3 px-4 border-r border-stone-200 dark:border-stone-800 cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1"><span>Vch Type</span>{sortField === 'voucherType' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('voucherNo')} className="py-3 px-4 border-r border-stone-200 dark:border-stone-800 cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1"><span>Vch No.</span>{sortField === 'voucherNo' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('debit')} className="py-3 px-4 border-r border-stone-200 dark:border-stone-800 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>Debit Amount</span>{sortField === 'debit' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('credit')} className="py-3 px-4 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>Credit Amount</span>{sortField === 'credit' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {paginatedTxns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400 font-medium">
                    No payment transaction records found matching your search criteria.
                  </td>
                </tr>
              ) : (
                paginatedTxns.map((t, i) => (
                  <tr key={t.id || i} className="hover:bg-orange-500/5 dark:hover:bg-stone-800/50 transition-colors">
                    <td className="py-2.5 px-4 border-r border-stone-200 dark:border-stone-800 font-mono text-stone-600 dark:text-stone-400">
                      {t.date}
                    </td>
                    <td className="py-2.5 px-4 border-r border-stone-200 dark:border-stone-800 font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
                      <span>{t.partyName}</span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700">
                        {t.voucherType || 'Payment'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-stone-200 dark:border-stone-800 font-mono text-stone-600 dark:text-stone-400">
                      {t.voucherNo}
                    </td>
                    <td className="py-2.5 px-4 border-r border-stone-200 dark:border-stone-800 text-right font-mono font-bold text-orange-600 dark:text-orange-400">
                      {(t.debit || t.amount || 0) > 0 ? formatCurrency(t.debit || t.amount) : ''}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-stone-500 dark:text-stone-400">
                      {(t.credit || 0) > 0 ? formatCurrency(t.credit) : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Grand Total Row */}
            <tfoot className="bg-stone-100 dark:bg-stone-950 font-extrabold text-stone-900 dark:text-white border-t-2 border-orange-500/40">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Grand Total ({filteredTxns.length} Vouchers)
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-orange-600 dark:text-orange-400">
                  {formatCurrency(totalDebitDisbursed)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-stone-500">
                  {formatCurrency(totalCreditAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-stone-200 dark:border-stone-800 text-xs bg-stone-50/50 dark:bg-stone-950/40">
            <span className="text-stone-500 font-medium">
              Showing <span className="font-bold text-stone-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-stone-900 dark:text-white">{Math.min(startIndex + pageSize, sortedTxns.length)}</span> of{' '}
              <span className="font-bold text-stone-900 dark:text-white">{sortedTxns.length}</span> Records
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-stone-700 dark:text-stone-300 font-bold disabled:opacity-40 hover:bg-stone-200 dark:hover:bg-stone-800 transition cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <span className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold border border-orange-500/20">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-stone-700 dark:text-stone-300 font-bold disabled:opacity-40 hover:bg-stone-200 dark:hover:bg-stone-800 transition cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="payments"
        pageTitle="Payment Register"
        onImportSuccess={(newSnapId) => loadData(newSnapId)}
      />
    </div>
  );
}
