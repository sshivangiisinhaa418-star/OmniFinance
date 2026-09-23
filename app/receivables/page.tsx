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
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  UploadCloud,
  ShieldAlert,
  TrendingUp,
  Search,
  Download,
  Filter,
  Percent,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  PieChart as PieIcon,
  Activity,
  AlertCircle,
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
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

interface CustomerRow {
  id: string;
  name: string;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
  riskRating: 'Low' | 'Moderate' | 'High' | 'Advance';
}

type SortField = 'name' | 'riskRating' | 'openingBalance' | 'debit' | 'credit' | 'closingBalance';

export default function ReceivablesPage() {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [dateFilteredTxns, setDateFilteredTxns] = useState<FinancialTransaction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'high_exposure' | 'no_payment' | 'advances'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('closingBalance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const pageSize = 10;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const loadData = async (targetSnapshotId?: string) => {
    setLoading(true);
    const snaps = await getSnapshotsForModule('receivables');
    setSnapshots(snaps);

    const activeId = targetSnapshotId || selectedSnapshotId || (snaps.length > 0 ? snaps[0].id : null);
    setSelectedSnapshotId(activeId);

    if (activeId) {
      const txns = await getSnapshotTransactions(activeId, 'receivables');
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
    setDateFilteredTxns(null);
    loadData(snap.id);
    setCurrentPage(1);
  };

  const activeTxns = dateFilteredTxns ?? transactions;

  // --- 1. CORE DATA ENRICHMENT & MATHEMATICAL CALCULATIONS ---
  const customers: CustomerRow[] = activeTxns.map(t => {
    const op = t.openingBalance || 0;
    const deb = t.debit || 0;
    const cred = t.credit || 0;
    const cl = t.closingBalance !== undefined ? t.closingBalance : op + deb - cred;

    let riskRating: 'Low' | 'Moderate' | 'High' | 'Advance' = 'Low';
    if (cl < 0) {
      riskRating = 'Advance';
    } else if (cred === 0 && deb > 50000) {
      riskRating = 'High';
    } else if (cl > 200000) {
      riskRating = 'Moderate';
    }

    return {
      id: t.id,
      name: t.partyName || 'Unknown Customer',
      openingBalance: op,
      debit: deb,
      credit: cred,
      closingBalance: cl,
      riskRating
    };
  });

  const activeSnapshot = snapshots.find(s => s.id === selectedSnapshotId);

  const totalOpening = activeSnapshot?.grandTotalOpening ?? customers.reduce((acc, c) => acc + c.openingBalance, 0);
  const totalDebit = activeSnapshot?.grandTotalDebit ?? customers.reduce((acc, c) => acc + c.debit, 0);
  const totalCredit = activeSnapshot?.grandTotalCredit ?? customers.reduce((acc, c) => acc + c.credit, 0);
  const totalClosing = activeSnapshot?.grandTotalClosing ?? customers.reduce((acc, c) => acc + c.closingBalance, 0);

  const totalPositiveReceivables = customers.filter(c => c.closingBalance > 0).reduce((s, c) => s + c.closingBalance, 0);
  const totalAdvanceCredits = Math.abs(customers.filter(c => c.closingBalance < 0).reduce((s, c) => s + c.closingBalance, 0));

  // --- 2. ADVANCED MATHEMATICAL FINANCIAL METRICS ---
  // A. Collection Efficiency Index (CEI %) = (Credit / (Opening + Debit)) * 100
  const collectionBase = totalOpening + totalDebit;
  const collectionEfficiencyPct = collectionBase > 0 ? Math.round((totalCredit / collectionBase) * 100) : 0;

  // B. Estimated Days Sales Outstanding (DSO Estimate) = (Closing Receivables / Total Billed Debit) * 30 days
  const dsoDays = totalDebit > 0 ? Math.round((totalPositiveReceivables / totalDebit) * 30) : 0;

  // C. Top 3 Customer Concentration Ratio (CR3)
  const sortedByBalance = [...customers].sort((a, b) => b.closingBalance - a.closingBalance);
  const top3ReceivablesSum = sortedByBalance.slice(0, 3).reduce((s, c) => s + Math.max(0, c.closingBalance), 0);
  const top3ConcentrationPct = totalPositiveReceivables > 0 ? Math.round((top3ReceivablesSum / totalPositiveReceivables) * 100) : 0;
  const topCustomer = sortedByBalance[0];

  // D. Expected Credit Loss (ECL / Bad Debt Provision Estimate)
  // 15% loss weight for high-risk zero collection debtors, 2% for normal active debtors
  const expectedCreditLoss = customers.reduce((s, c) => {
    if (c.closingBalance <= 0) return s;
    if (c.credit === 0 && c.debit > 0) return s + c.closingBalance * 0.15;
    return s + c.closingBalance * 0.02;
  }, 0);

  // --- 3. BALANCE TIER DISTRIBUTION CHART DATA ---
  const balanceTiers = [
    { tier: '< ₹50k', amount: customers.filter(c => c.closingBalance > 0 && c.closingBalance < 50000).reduce((s, c) => s + c.closingBalance, 0), count: customers.filter(c => c.closingBalance > 0 && c.closingBalance < 50000).length, fill: '#10b981' },
    { tier: '₹50k - ₹2L', amount: customers.filter(c => c.closingBalance >= 50000 && c.closingBalance < 200000).reduce((s, c) => s + c.closingBalance, 0), count: customers.filter(c => c.closingBalance >= 50000 && c.closingBalance < 200000).length, fill: '#3b82f6' },
    { tier: '₹2L - ₹5L', amount: customers.filter(c => c.closingBalance >= 200000 && c.closingBalance < 500000).reduce((s, c) => s + c.closingBalance, 0), count: customers.filter(c => c.closingBalance >= 200000 && c.closingBalance < 500000).length, fill: '#f59e0b' },
    { tier: '> ₹5L', amount: customers.filter(c => c.closingBalance >= 500000).reduce((s, c) => s + c.closingBalance, 0), count: customers.filter(c => c.closingBalance >= 500000).length, fill: '#f43f5e' },
  ];

  // --- 4. TOP DEBTORS DONUT CHART DATA ---
  const top5Debtors = sortedByBalance.filter(c => c.closingBalance > 0).slice(0, 5);
  const pieColors = ['#ea580c', '#f59e0b', '#10b981', '#6366f1', '#a855f7'];

  // --- 5. SEARCH, SORT & TAB FILTERING ---
  const filteredCustomers = customers.filter(c => {
    if (activeTabFilter === 'high_exposure' && c.closingBalance < 100000) return false;
    if (activeTabFilter === 'no_payment' && (c.credit > 0 || c.closingBalance <= 0)) return false;
    if (activeTabFilter === 'advances' && c.closingBalance >= 0) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q);
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string') {
      valA = (valA as string).toLowerCase();
      valB = (valB as string).toLowerCase();
    }
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / pageSize));
  const paginatedCustomers = sortedCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatBalance = (val: number) => {
    if (val === 0) return '₹0.00 Dr';
    const numStr = Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val < 0) return `₹${numStr} Cr`;
    return `₹${numStr} Dr`;
  };

  const formatCurrency = (val: number) => {
    return `₹${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportReceivablesCSV = () => {
    if (!filteredCustomers.length) return;
    const headers = ['Particulars / Customer Name', 'Opening Balance', 'Debit (New Invoices)', 'Credit (Collections)', 'Closing Balance', 'Risk Rating'];
    const rows = filteredCustomers.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      c.openingBalance,
      c.debit,
      c.credit,
      c.closingBalance,
      c.riskRating
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `receivables_ledger_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!loading && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="No Receivables Aging Data"
          description="Upload receivables or sales vouchers to view customer opening balances, debit/credit transactions, collection efficiency, and customer risk breakdown."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
        <QuickUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          defaultDatasetType="receivables"
          pageTitle="Accounts Receivable"
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
            <Clock className="w-6 h-6 text-orange-600 dark:text-orange-500" />
            <span>Accounts Receivable Intelligence Board</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Real-time Debtors Audit, Collection Efficiency Index (CEI), Expected Credit Loss &amp; DSO Analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SnapshotSelector
            moduleTitle="Receivables Transactions"
            snapshots={snapshots}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={handleSelectSnapshot}
          />

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 transition self-start md:self-auto shrink-0 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Receivables Data</span>
          </button>
        </div>
      </div>

      {/* Date Range Calendar Filter with 15-Day Presets & Out-of-Range Alerts */}
      <DateRangePicker
        transactions={transactions}
        onDateRangeChange={(filtered) => setDateFilteredTxns(filtered)}
      />

      {/* SECTION 1: EXECUTIVE OWNER MATHEMATICAL KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Net Receivables"
          value={formatBalance(totalClosing)}
          isCurrency={false}
          icon={Clock}
          gradientClass="kpi-gradient-orange"
          iconColor="text-orange-500"
        />
        <KpiCard
          title="Collection Efficiency (CEI)"
          value={`${collectionEfficiencyPct}%`}
          isCurrency={false}
          icon={Percent}
          gradientClass="kpi-gradient-emerald"
          iconColor="text-emerald-500"
        />
        <KpiCard
          title="Estimated DSO (Days)"
          value={`${dsoDays} Days`}
          isCurrency={false}
          icon={Activity}
          gradientClass="kpi-gradient-blue"
          iconColor="text-blue-500"
        />
        <KpiCard
          title="Est. Credit Loss Risk (ECL)"
          value={formatCurrency(expectedCreditLoss)}
          isCurrency={false}
          icon={AlertTriangle}
          gradientClass="kpi-gradient-rose"
          iconColor="text-rose-500"
        />
        <KpiCard
          title="Top 3 Debtor Concentration"
          value={`${top3ConcentrationPct}%`}
          isCurrency={false}
          icon={ShieldAlert}
          gradientClass="kpi-gradient-purple"
          iconColor="text-purple-500"
        />
      </div>

      {/* SECTION 2: RISK & RECOVERY BRIEFING CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Concentration Risk Alert Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              <span>Customer Concentration Risk</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${top3ConcentrationPct > 60 ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'}`}>
              {top3ConcentrationPct > 60 ? 'High Concentration' : 'Balanced Spread'}
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-stone-900 dark:text-white font-mono">
              {top3ConcentrationPct}% <span className="text-xs font-medium text-stone-500">in Top 3 Debtors</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Largest Account: <strong className="text-stone-800 dark:text-stone-200">{topCustomer?.name || 'N/A'}</strong> ({formatBalance(topCustomer?.closingBalance || 0)})
            </p>
          </div>
        </div>

        {/* Collection Recovery Rate Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Total Payments Collected</span>
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Recovered
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(totalCredit)}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Billed Invoices Total: <strong className="text-stone-800 dark:text-stone-200">{formatCurrency(totalDebit)}</strong>
            </p>
          </div>
        </div>

        {/* Advance & Credit Balance Summary Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <span>Customer Advances Held (Cr)</span>
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
              Liability Credit
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {formatCurrency(totalAdvanceCredits)}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Parties with Advance Credit: <strong className="text-stone-800 dark:text-stone-200">{customers.filter(c => c.closingBalance < 0).length} Customers</strong>
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: VISUAL CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receivables Balance Tier Bar Chart */}
        <div className="lg:col-span-2">
          <ChartCard title="Debtors Outstanding by Amount Range" subtitle="Color Bars = Total Debtors Outstanding in each amount tier">
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={balanceTiers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} />
                <XAxis dataKey="tier" stroke="#78716c" fontSize={11} />
                <YAxis stroke="#78716c" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} labelStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Bar dataKey="amount" name="Outstanding Amount" radius={[6, 6, 0, 0]}>
                  {balanceTiers.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Top 5 Debtors Donut Share Chart */}
        <div>
          <ChartCard title="Top Debtors Share" subtitle="Percentage share of top customer balances">
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie data={top5Debtors} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="closingBalance" nameKey="name">
                  {top5Debtors.map((_, idx) => (
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

      {/* SECTION 4: DEBTORS LEDGER TABLE WITH TAB FILTERS, SEARCH & EXPORT */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row items-center justify-between gap-3 bg-stone-50/50 dark:bg-stone-950/40">
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-500" />
              <span>Debtors Accounts Receivable Ledger</span>
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Opening Balance + Debit - Credit = Closing Balance (Direct from Tally Excel)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Quick Filter Tabs */}
            <div className="flex items-center p-1 bg-stone-200/60 dark:bg-stone-800 rounded-xl text-xs">
              <button
                onClick={() => { setActiveTabFilter('all'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${activeTabFilter === 'all' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'}`}
              >
                All ({customers.length})
              </button>
              <button
                onClick={() => { setActiveTabFilter('high_exposure'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${activeTabFilter === 'high_exposure' ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'}`}
              >
                High Value (&gt;₹1L)
              </button>
              <button
                onClick={() => { setActiveTabFilter('no_payment'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${activeTabFilter === 'no_payment' ? 'bg-white dark:bg-stone-900 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'}`}
              >
                Zero Collection
              </button>
              <button
                onClick={() => { setActiveTabFilter('advances'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${activeTabFilter === 'advances' ? 'bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'}`}
              >
                Advances (Cr)
              </button>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search Customer..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            {/* Export CSV Button */}
            <button
              onClick={exportReceivablesCSV}
              className="px-3 py-1.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 dark:bg-stone-950/80 text-stone-700 dark:text-stone-300 font-bold uppercase tracking-wider text-[11px] border-b border-stone-200 dark:border-stone-800 select-none">
              <tr>
                <th onClick={() => handleSort('name')} className="py-3 px-4 cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1">
                    <span>Particulars / Customer Name</span>
                    {sortField === 'name' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th onClick={() => handleSort('riskRating')} className="py-3 px-4 text-center cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-center gap-1">
                    <span>Credit Risk Rating</span>
                    {sortField === 'riskRating' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th onClick={() => handleSort('openingBalance')} className="py-3 px-4 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1">
                    <span>Opening Balance</span>
                    {sortField === 'openingBalance' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th onClick={() => handleSort('debit')} className="py-3 px-4 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1">
                    <span>Transactions (Debit)</span>
                    {sortField === 'debit' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th onClick={() => handleSort('credit')} className="py-3 px-4 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1">
                    <span>Transactions (Credit)</span>
                    {sortField === 'credit' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th onClick={() => handleSort('closingBalance')} className="py-3 px-4 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1">
                    <span>Closing Balance</span>
                    {sortField === 'closingBalance' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800/40">
              {paginatedCustomers.map(c => (
                <tr key={c.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
                  <td className="py-3 px-4 font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>{c.name}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      c.riskRating === 'Advance' ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' :
                      c.riskRating === 'High' ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' :
                      c.riskRating === 'Moderate' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                      'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      {c.riskRating}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-stone-600 dark:text-stone-400">
                    {c.openingBalance !== 0 ? formatBalance(c.openingBalance) : ''}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {c.debit !== 0 ? formatCurrency(c.debit) : ''}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {c.credit !== 0 ? formatCurrency(c.credit) : ''}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                    {c.closingBalance !== 0 ? formatBalance(c.closingBalance) : ''}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Grand Total Row */}
            <tfoot className="bg-stone-100/90 dark:bg-stone-950 font-extrabold text-stone-900 dark:text-white border-t-2 border-orange-500/40">
              <tr>
                <td className="py-3.5 px-4 text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Grand Total ({filteredCustomers.length} Parties)
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-[10px] text-stone-400">Audited</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs">
                  {formatBalance(totalOpening)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalCredit)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                  {formatBalance(totalClosing)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-stone-200 dark:border-stone-800 text-xs">
            <span className="text-stone-500 font-medium">
              Showing <span className="font-bold text-stone-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-stone-900 dark:text-white">{Math.min(currentPage * pageSize, filteredCustomers.length)}</span> of{' '}
              <span className="font-bold text-stone-900 dark:text-white">{filteredCustomers.length}</span> Parties
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
        defaultDatasetType="receivables"
        pageTitle="Accounts Receivable"
        onImportSuccess={(newSnapId) => loadData(newSnapId)}
      />
    </div>
  );
}
