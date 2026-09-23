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
  Receipt,
  Wallet
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

export default function ReceiptsPage() {
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
    const snaps = await getSnapshotsForModule('receipts');
    setSnapshots(snaps);

    const activeId = targetSnapshotId || selectedSnapshotId || (snaps.length > 0 ? snaps[0].id : null);
    setSelectedSnapshotId(activeId);

    if (activeId) {
      const txns = await getSnapshotTransactions(activeId, 'receipts');
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
  const totalCreditCollected = activeTxns.reduce((s, t) => s + (t.credit || t.amount || 0), 0);
  const totalDebitAmount = activeTxns.reduce((s, t) => s + (t.debit || 0), 0);
  
  const creditAmounts = activeTxns.map(t => t.credit || t.amount || 0).filter(a => a > 0);
  const maxReceipt = creditAmounts.length > 0 ? Math.max(...creditAmounts) : 0;
  const avgReceipt = creditAmounts.length > 0 ? totalCreditCollected / creditAmounts.length : 0;

  // Payer distribution aggregation for Donut Chart
  const payerMap = new Map<string, number>();
  activeTxns.forEach(t => {
    const payer = t.partyName || 'Cash Customer';
    const amt = t.credit || t.amount || 0;
    payerMap.set(payer, (payerMap.get(payer) || 0) + amt);
  });

  const topPayersData = Array.from(payerMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const pieColors = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ea580c'];

  // Monthly trends calculation
  const monthMap = new Map<string, number>();
  activeTxns.forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    if (isNaN(d.getTime())) return;
    const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    monthMap.set(key, (monthMap.get(key) || 0) + (t.credit || t.amount || 0));
  });

  const monthlyTrends = Array.from(monthMap.entries()).map(([month, total]) => ({ month, total }));

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0.00';
    return `₹${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportReceiptsCSV = () => {
    if (!filteredTxns.length) return;
    const headers = ['Date', 'Particulars', 'Voucher Type', 'Voucher No.', 'Credit Amount', 'Debit Amount'];
    const rows = filteredTxns.map(t => [
      t.date || '',
      `"${(t.partyName || '').replace(/"/g, '""')}"`,
      `"${t.voucherType || 'Receipt'}"`,
      `"${t.voucherNo || ''}"`,
      t.credit || t.amount || 0,
      t.debit || 0,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `receipt_register_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!loading && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="No Receipt Register Data"
          description="Upload a Tally Receipt Register Excel export to analyze cash/bank receipt collections, top payers, and receipt voucher records."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
        <QuickUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          defaultDatasetType="receipts"
          pageTitle="Receipt Register"
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
            <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
            <span>Receipt Register Board</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Real-time Cash &amp; Bank Receipt Vouchers Audit (Date, Particulars &amp; Credit Amounts)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SnapshotSelector
            moduleTitle="Receipt Register"
            snapshots={snapshots}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={handleSelectSnapshot}
          />

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition self-start md:self-auto shrink-0 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Receipt Excel</span>
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
          title="Total Receipts Collected"
          value={formatCurrency(totalCreditCollected)}
          isCurrency={false}
          icon={DollarSign}
          gradientClass="kpi-gradient-emerald"
          iconColor="text-emerald-500"
        />
        <KpiCard
          title="Max Single Receipt"
          value={formatCurrency(maxReceipt)}
          isCurrency={false}
          icon={ArrowUpRight}
          gradientClass="kpi-gradient-orange"
          iconColor="text-orange-500"
        />
        <KpiCard
          title="Average Receipt Amount"
          value={formatCurrency(avgReceipt)}
          isCurrency={false}
          icon={TrendingUp}
          gradientClass="kpi-gradient-blue"
          iconColor="text-blue-500"
        />
        <KpiCard
          title="Total Receipt Vouchers"
          value={activeTxns.length}
          isCurrency={false}
          icon={Wallet}
          gradientClass="kpi-gradient-purple"
          iconColor="text-purple-500"
        />
      </div>

      {/* SECTION 2: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Monthly Receipt Collection Trend" subtitle="🟢 Solid Emerald Line = Total Credit Collection Inflow per month">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} />
                <XAxis dataKey="month" stroke="#78716c" fontSize={11} />
                <YAxis stroke="#78716c" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} labelStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Line type="monotone" dataKey="total" name="Credit Collected" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={(value) => <span className="text-stone-700 dark:text-stone-300 font-bold text-[11px]">{value}</span>} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div>
          <ChartCard title="Top Payers / Particulars Share" subtitle="Pie Slices = % Share of Total Collection Inflow for Top 5 Payers">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={topPayersData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="name">
                  {topPayersData.map((_, idx) => (
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
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span>Receipt Register Transactions</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Showing {filteredTxns.length} records parsed from uploaded Tally Receipt Register Excel
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
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <button
              onClick={exportReceiptsCSV}
              disabled={!filteredTxns.length}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 shrink-0 cursor-pointer"
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
                <th onClick={() => handleSort('date')} className="py-3 px-4 border-r border-stone-200 dark:border-stone-800 cursor-pointer hover:text-emerald-500 transition">
                  <div className="flex items-center gap-1"><span>Date</span>{sortField === 'date' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('partyName')} className="py-3 px-4 border-r border-stone-200 dark:border-stone-800 min-w-[200px] cursor-pointer hover:text-emerald-500 transition">
                  <div className="flex items-center gap-1"><span>Particulars</span>{sortField === 'partyName' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('voucherType')} className="py-3 px-4 border-r border-stone-200 dark:border-stone-800 cursor-pointer hover:text-emerald-500 transition">
                  <div className="flex items-center gap-1"><span>Vch Type</span>{sortField === 'voucherType' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('voucherNo')} className="py-3 px-4 border-r border-stone-200 dark:border-stone-800 cursor-pointer hover:text-emerald-500 transition">
                  <div className="flex items-center gap-1"><span>Vch No.</span>{sortField === 'voucherNo' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('credit')} className="py-3 px-4 border-r border-stone-200 dark:border-stone-800 text-right cursor-pointer hover:text-emerald-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>Credit Amount</span>{sortField === 'credit' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('debit')} className="py-3 px-4 text-right cursor-pointer hover:text-emerald-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>Debit Amount</span>{sortField === 'debit' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {paginatedTxns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400 font-medium">
                    No receipt transaction records found matching your search criteria.
                  </td>
                </tr>
              ) : (
                paginatedTxns.map((t, i) => (
                  <tr key={t.id || i} className="hover:bg-emerald-500/5 dark:hover:bg-stone-800/50 transition-colors">
                    <td className="py-2.5 px-4 border-r border-stone-200 dark:border-stone-800 font-mono text-stone-600 dark:text-stone-400">
                      {t.date}
                    </td>
                    <td className="py-2.5 px-4 border-r border-stone-200 dark:border-stone-800 font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{t.partyName}</span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700">
                        {t.voucherType || 'Receipt'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-stone-200 dark:border-stone-800 font-mono text-stone-600 dark:text-stone-400">
                      {t.voucherNo}
                    </td>
                    <td className="py-2.5 px-4 border-r border-stone-200 dark:border-stone-800 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {(t.credit || t.amount || 0) > 0 ? formatCurrency(t.credit || t.amount) : ''}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-stone-500 dark:text-stone-400">
                      {(t.debit || 0) > 0 ? formatCurrency(t.debit) : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Grand Total Row */}
            <tfoot className="bg-stone-100 dark:bg-stone-950 font-extrabold text-stone-900 dark:text-white border-t-2 border-emerald-500/40">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Grand Total ({filteredTxns.length} Vouchers)
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalCreditCollected)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-stone-500">
                  {formatCurrency(totalDebitAmount)}
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

              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-500/20">
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
        defaultDatasetType="receipts"
        pageTitle="Receipt Register"
        onImportSuccess={(newSnapId) => loadData(newSnapId)}
      />
    </div>
  );
}
