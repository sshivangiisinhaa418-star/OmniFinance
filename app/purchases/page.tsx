'use client';

import React, { useState, useEffect } from 'react';
import { getSnapshotsForModule, getSnapshotTransactions } from '@/lib/storage';
import { FinancialTransaction, FinancialSnapshot } from '@/types';
import { calculateVendorSummaries, calculateMonthlyTrends } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { SnapshotSelector } from '@/components/dashboard/SnapshotSelector';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import {
  ShoppingBag,
  FileText,
  Building2,
  CreditCard,
  UploadCloud,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Zap,
  Filter,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  PieChart as PieIcon,
  Percent,
  Receipt,
  Truck,
  Wrench,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface LowFrequencyLedger {
  name: string;
  total: number;
  count: number;
}

export default function PurchasesPage() {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [dateFilteredTxns, setDateFilteredTxns] = useState<FinancialTransaction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'high_value' | 'tax_vouchers' | 'freight'>('all');
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
    const snaps = await getSnapshotsForModule('purchases');
    setSnapshots(snaps);

    const activeId = targetSnapshotId || selectedSnapshotId || (snaps.length > 0 ? snaps[0].id : null);
    setSelectedSnapshotId(activeId);

    if (activeId) {
      const txns = await getSnapshotTransactions(activeId, 'purchases');
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

  if (!loading && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="No Purchase Data Available"
          description="Upload Tally Purchase Vouchers to track supplier spending, vendor concentration, tax breakdown, and rare ledger accounts."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
        <QuickUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          defaultDatasetType="purchases"
          pageTitle="Purchases Dashboard"
          onImportSuccess={(newSnapId) => loadData(newSnapId)}
        />
      </div>
    );
  }

  // --- 1. CORE EXECUTIVE STATS ---
  const totalValue = activeTxns.reduce((s, t) => s + (t.grossTotal || t.totalAmount || t.value || t.amount || 0), 0);
  const totalQuantity = activeTxns.reduce((s, t) => s + (t.quantity || 0), 0);
  
  const totalIGST = activeTxns.reduce((s, t) => s + (t.igst || 0), 0);
  const totalCGST = activeTxns.reduce((s, t) => s + (t.cgst || 0), 0);
  const totalSGST = activeTxns.reduce((s, t) => s + (t.sgst || 0), 0);
  const totalGSTClaimable = totalIGST + totalCGST + totalSGST;

  const totalTransportation = activeTxns.reduce((s, t) => s + (t.transportationCharges || 0), 0);
  const totalWorkContract = activeTxns.reduce((s, t) => s + (t.workContract || 0), 0);

  const amounts = activeTxns
    .map(t => t.grossTotal || t.totalAmount || t.value || t.amount || 0)
    .filter(a => a > 0);

  const maxOrder = amounts.length > 0 ? Math.max(...amounts) : 0;
  const minOrder = amounts.length > 0 ? Math.min(...amounts) : 0;
  const avgOrder = amounts.length > 0 ? totalValue / amounts.length : 0;

  // --- 2. VENDOR CONCENTRATION & RISK SCORE ---
  const vendors = calculateVendorSummaries(activeTxns);
  const topVendor = vendors[0];
  const top3Sum = vendors.slice(0, 3).reduce((s, v) => s + v.totalPurchases, 0);
  const top3ConcentrationPct = totalValue > 0 ? Math.round((top3Sum / totalValue) * 100) : 0;

  const vendorRiskLevel = top3ConcentrationPct > 70 ? 'High Dependency' : top3ConcentrationPct > 40 ? 'Moderate Dependency' : 'Balanced';
  const vendorRiskColor = top3ConcentrationPct > 70 ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' : top3ConcentrationPct > 40 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';

  const monthlyTrends = calculateMonthlyTrends(activeTxns);

  // --- 3. COST CENTER CATEGORIZATION ---
  const costCenterData = [
    { category: 'Direct Procurement', amount: Math.round(totalValue * 0.65), fill: '#ea580c' },
    { category: 'GST Input Tax Credit', amount: Math.round(totalGSTClaimable), fill: '#10b981' },
    { category: 'Logistics & Freight', amount: Math.round(totalTransportation), fill: '#3b82f6' },
    { category: 'Services & Work Contract', amount: Math.round(totalWorkContract), fill: '#a855f7' },
  ];

  // --- 4. RARE / INFREQUENT LEDGERS (FOR ACCOUNTANT RECONCILIATION) ---
  const rareLedgers: LowFrequencyLedger[] = [];
  const ledgerMap: Record<string, { total: number; count: number }> = {};

  activeTxns.forEach(t => {
    const checkFields: [string, number][] = [
      ['Transportation Charges', t.transportationCharges || 0],
      ['Work Contract', t.workContract || 0],
      ['Round Off', t.roundOff || 0],
      ['IGST Input', t.igst || 0],
      ['CGST Input', t.cgst || 0],
      ['SGST Input', t.sgst || 0],
    ];

    checkFields.forEach(([name, val]) => {
      if (val !== 0) {
        if (!ledgerMap[name]) ledgerMap[name] = { total: 0, count: 0 };
        ledgerMap[name].total += val;
        ledgerMap[name].count += 1;
      }
    });
  });

  Object.entries(ledgerMap).forEach(([name, stat]) => {
    if (stat.count >= 1 && stat.count <= 20) {
      rareLedgers.push({ name, total: stat.total, count: stat.count });
    }
  });

  // --- 5. FILTERING & SEARCH ---
  const filteredTxns = activeTxns.filter(t => {
    // Quick Tab Filter
    const val = t.grossTotal || t.totalAmount || t.value || t.amount || 0;
    if (activeTabFilter === 'high_value' && val < 100000) return false;
    if (activeTabFilter === 'tax_vouchers' && (t.igst || 0) + (t.cgst || 0) + (t.sgst || 0) === 0) return false;
    if (activeTabFilter === 'freight' && (t.transportationCharges || 0) === 0) return false;

    // Search Query
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.partyName?.toLowerCase().includes(q) ||
      t.voucherNo?.toLowerCase().includes(q) ||
      t.voucherType?.toLowerCase().includes(q) ||
      t.gstin?.toLowerCase().includes(q) ||
      t.panNo?.toLowerCase().includes(q)
    );
  });

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

  const totalPages = Math.max(1, Math.ceil(sortedTxns.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedTxns.slice(startIndex, startIndex + pageSize);

  const fmt = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0.00';
    return `₹${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const pieColors = ['#ea580c', '#f59e0b', '#10b981', '#6366f1', '#a855f7'];

  const exportPurchasesCSV = () => {
    if (!filteredTxns.length) return;
    const headers = ['Date', 'Particulars', 'Voucher Type', 'Voucher No.', 'GSTIN', 'Quantity', 'Value', 'Gross Total', 'IGST', 'CGST', 'SGST', 'Transportation'];
    const rows = filteredTxns.map(t => [
      t.date || '',
      `"${(t.partyName || '').replace(/"/g, '""')}"`,
      `"${t.voucherType || 'Purchase'}"`,
      `"${t.voucherNo || ''}"`,
      `"${t.gstin || ''}"`,
      t.quantity || 0,
      t.value || 0,
      t.grossTotal || t.totalAmount || 0,
      t.igst || 0,
      t.cgst || 0,
      t.sgst || 0,
      t.transportationCharges || 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `purchases_register_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-orange-600 dark:text-orange-500" />
            <span>Procurement &amp; Purchases Intelligence Suite</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Real-time Spend Analytics, Vendor Risk Rating, Tax Credit Audit &amp; Ledger Mismatch Prevention
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SnapshotSelector
            moduleTitle="Purchases Transactions"
            snapshots={snapshots}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={handleSelectSnapshot}
          />

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 transition self-start sm:self-auto shrink-0 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Purchase Excel</span>
          </button>
        </div>
      </div>

      {/* Date Range Calendar Filter with 15-Day Presets & Out-of-Range Alerts */}
      <DateRangePicker
        transactions={transactions}
        onDateRangeChange={(filtered) => setDateFilteredTxns(filtered)}
      />

      {/* SECTION 1: EXECUTIVE OWNER KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Procurement Spending"
          value={totalValue}
          icon={DollarSign}
          gradientClass="kpi-gradient-orange"
          iconColor="text-orange-500"
        />
        <KpiCard
          title="Max Single Purchase Order"
          value={maxOrder}
          icon={ArrowUpRight}
          gradientClass="kpi-gradient-emerald"
          iconColor="text-emerald-500"
        />
        <KpiCard
          title="Min Order Benchmark"
          value={minOrder}
          icon={ArrowDownRight}
          gradientClass="kpi-gradient-purple"
          iconColor="text-purple-500"
        />
        <KpiCard
          title="Average Order Value"
          value={avgOrder}
          icon={CreditCard}
          gradientClass="kpi-gradient-amber"
          iconColor="text-amber-500"
        />
      </div>

      {/* SECTION 2: VENDOR RISK & TAX AUDIT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vendor Concentration Risk Alert Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              <span>Supplier Dependency Risk</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${vendorRiskColor}`}>
              {vendorRiskLevel}
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-stone-900 dark:text-white font-mono">
              {top3ConcentrationPct}% <span className="text-xs font-medium text-stone-500">of spend in Top 3 Suppliers</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Top Supplier: <strong className="text-stone-800 dark:text-stone-200">{topVendor?.name || 'N/A'}</strong> ({fmt(topVendor?.totalPurchases)})
            </p>
          </div>
        </div>

        {/* GST Input Tax Credit Summary Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-500" />
              <span>GST Input Tax Credit (ITC)</span>
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Claimable
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {fmt(totalGSTClaimable)}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              <span>IGST: <strong className="text-stone-700 dark:text-stone-300">{fmt(totalIGST)}</strong></span>
              <span>•</span>
              <span>CGST/SGST: <strong className="text-stone-700 dark:text-stone-300">{fmt(totalCGST + totalSGST)}</strong></span>
            </div>
          </div>
        </div>

        {/* Freight & Logistics Expense Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-500" />
              <span>Freight &amp; Transportation</span>
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
              Logistics
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {fmt(totalTransportation)}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Total Vouchers Processed: <strong className="text-stone-800 dark:text-stone-200">{transactions.length} Bills</strong>
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: VISUAL CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Procurement Outflow Bar Chart */}
        <div className="lg:col-span-2">
          <ChartCard title="Monthly Procurement Outflow Trend" subtitle="Orange Bars = Total Purchase Outflow per Month">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} />
                <XAxis dataKey="month" stroke="#78716c" fontSize={11} />
                <YAxis stroke="#78716c" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} labelStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Bar dataKey="purchases" name="Procurement Outflow" fill="#ea580c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Top Vendor Spending Share Donut Chart */}
        <div>
          <ChartCard title="Top Supplier Share" subtitle="Percentage vendor spend distribution">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={vendors.slice(0, 5)} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="totalPurchases" nameKey="name">
                  {vendors.slice(0, 5).map((_, idx) => (
                    <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} labelStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(value) => <span className="text-stone-700 dark:text-stone-300 font-bold text-[11px]">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* SECTION 4: SPECIAL ACCOUNTANT NOTICE FOR RARE LEDGERS */}
      {rareLedgers.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-sm">
              <Layers className="w-5 h-5" />
              <span>Accountant Ledger Audit: Low-Frequency / Rare Expenses (1-20 Entries)</span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
              {rareLedgers.length} Ledgers Audited
            </span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-300">
            These ledgers appear infrequently (1-20 times). We isolated them here so that <strong>no single amount or paise</strong> is missed during tax filing or monthly audit.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            {rareLedgers.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-amber-500/20 space-y-1">
                <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400 truncate" title={item.name}>
                  {item.name}
                </div>
                <div className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                  {fmt(item.total)}
                </div>
                <div className="text-[10px] text-stone-400 font-medium">
                  {item.count} {item.count === 1 ? 'entry' : 'entries'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: DYNAMIC PURCHASES REGISTER TABLE WITH QUICK FILTER TABS */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row items-center justify-between gap-3 bg-stone-50/50 dark:bg-stone-950/40">
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white tracking-wide flex items-center gap-2">
              <span>Purchase Register Vouchers Log</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                {filteredTxns.length} Records
              </span>
            </h3>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-stone-200 dark:bg-stone-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => { setActiveTabFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${activeTabFilter === 'all' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'}`}
            >
              All Vouchers
            </button>
            <button
              onClick={() => { setActiveTabFilter('high_value'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${activeTabFilter === 'high_value' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'}`}
            >
              High Value (&gt;₹1L)
            </button>
            <button
              onClick={() => { setActiveTabFilter('tax_vouchers'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${activeTabFilter === 'tax_vouchers' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'}`}
            >
              Tax Credit Bills
            </button>
            <button
              onClick={() => { setActiveTabFilter('freight'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${activeTabFilter === 'freight' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'}`}
            >
              Freight / Transport
            </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search Particulars, Voucher, GSTIN..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>

            <button
              onClick={exportPurchasesCSV}
              disabled={!filteredTxns.length}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700 dark:text-stone-300 border-collapse whitespace-nowrap">
            <thead className="bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-200 font-bold text-[11px] border-b border-stone-200 dark:border-stone-800 uppercase tracking-wider sticky top-0 z-10 shadow-sm select-none">
              <tr>
                <th onClick={() => handleSort('date')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1"><span>Date</span>{sortField === 'date' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('partyName')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 min-w-[180px] cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1"><span>Particulars</span>{sortField === 'partyName' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('voucherType')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1"><span>Voucher Type</span>{sortField === 'voucherType' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('voucherNo')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1"><span>Voucher No.</span>{sortField === 'voucherNo' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('gstin')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1"><span>GSTIN/UIN</span>{sortField === 'gstin' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('quantity')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>Quantity</span>{sortField === 'quantity' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('value')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>Value</span>{sortField === 'value' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('grossTotal')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>Gross Total</span>{sortField === 'grossTotal' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('igst')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>IGST</span>{sortField === 'igst' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('cgst')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>CGST</span>{sortField === 'cgst' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('sgst')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>SGST</span>{sortField === 'sgst' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('transportationCharges')} className="py-3 px-3 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>Transportation</span>{sortField === 'transportationCharges' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-stone-400 font-medium">
                    No purchase transaction records found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((t, i) => (
                  <tr
                    key={t.id || i}
                    className="hover:bg-orange-500/5 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 font-mono text-stone-600 dark:text-stone-400">
                      {t.date}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 font-bold text-stone-900 dark:text-stone-100">
                      {t.partyName}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700">
                        {t.voucherType || 'Purchase'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 font-semibold font-mono text-stone-800 dark:text-stone-200">
                      {t.voucherNo}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-mono text-[11px]">
                      {t.gstin || '-'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-stone-700 dark:text-stone-300">
                      {(t.quantity || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-stone-800 dark:text-stone-200 font-medium">
                      {fmt(t.value)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono font-bold text-orange-600 dark:text-orange-400">
                      {fmt(t.grossTotal || t.totalAmount || t.amount)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-stone-600 dark:text-stone-400">
                      {fmt(t.igst)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-stone-600 dark:text-stone-400">
                      {fmt(t.cgst)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-stone-600 dark:text-stone-400">
                      {fmt(t.sgst)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-600 dark:text-stone-400">
                      {fmt(t.transportationCharges)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 bg-stone-50/50 dark:bg-stone-950/40">
            <span>
              Showing Page <strong className="text-stone-900 dark:text-white">{currentPage}</strong> of <strong className="text-stone-900 dark:text-white">{totalPages}</strong> ({filteredTxns.length} Total Vouchers)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 disabled:opacity-40 text-stone-800 dark:text-stone-200 font-bold transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 disabled:opacity-40 text-stone-800 dark:text-stone-200 font-bold transition cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="purchases"
        pageTitle="Purchases Dashboard"
        onImportSuccess={(newSnapId) => loadData(newSnapId)}
      />
    </div>
  );
}
