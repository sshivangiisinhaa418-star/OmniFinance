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
  AlertTriangle,
  CheckCircle2,
  Building2,
  UploadCloud,
  ShieldAlert,
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
  Truck,
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

interface VendorRow {
  id: string;
  name: string;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
  riskRating: 'Low' | 'Moderate' | 'High' | 'Advance';
}

type SortField = 'name' | 'riskRating' | 'openingBalance' | 'debit' | 'credit' | 'closingBalance';

export default function PayablesPage() {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [dateFilteredTxns, setDateFilteredTxns] = useState<FinancialTransaction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'high_exposure' | 'unsettled' | 'advances'>('all');
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
    const snaps = await getSnapshotsForModule('payables');
    setSnapshots(snaps);

    const activeId = targetSnapshotId || selectedSnapshotId || (snaps.length > 0 ? snaps[0].id : null);
    setSelectedSnapshotId(activeId);

    if (activeId) {
      const txns = await getSnapshotTransactions(activeId, 'payables');
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
  const vendors: VendorRow[] = activeTxns.map(t => {
    const op = t.openingBalance || 0;
    const deb = t.debit || 0;
    const cred = t.credit || 0;
    const cl = t.closingBalance !== undefined ? t.closingBalance : op + cred - deb;

    let riskRating: 'Low' | 'Moderate' | 'High' | 'Advance' = 'Low';
    if (cl < 0) {
      riskRating = 'Advance';
    } else if (deb === 0 && cred > 50000) {
      riskRating = 'High';
    } else if (cl > 200000) {
      riskRating = 'Moderate';
    }

    return {
      id: t.id,
      name: t.partyName || 'Unknown Vendor',
      openingBalance: op,
      debit: deb,
      credit: cred,
      closingBalance: cl,
      riskRating
    };
  });

  const activeSnapshot = snapshots.find(s => s.id === selectedSnapshotId);

  const totalOpening = activeSnapshot?.grandTotalOpening ?? vendors.reduce((acc, v) => acc + v.openingBalance, 0);
  const totalDebit = activeSnapshot?.grandTotalDebit ?? vendors.reduce((acc, v) => acc + v.debit, 0);
  const totalCredit = activeSnapshot?.grandTotalCredit ?? vendors.reduce((acc, v) => acc + v.credit, 0);
  const totalClosing = activeSnapshot?.grandTotalClosing ?? vendors.reduce((acc, v) => acc + v.closingBalance, 0);

  const totalPositivePayables = vendors.filter(v => v.closingBalance > 0).reduce((s, v) => s + v.closingBalance, 0);
  const totalAdvancePaid = Math.abs(vendors.filter(v => v.closingBalance < 0).reduce((s, v) => s + v.closingBalance, 0));

  // --- 2. ADVANCED MATHEMATICAL FINANCIAL METRICS ---
  // A. Payment Settlement Efficiency (PSE %) = (Debit / (Opening + Credit)) * 100
  const paymentBase = totalOpening + totalCredit;
  const paymentEfficiencyPct = paymentBase > 0 ? Math.round((totalDebit / paymentBase) * 100) : 0;

  // B. Estimated Days Payable Outstanding (DPO Estimate) = (Closing Payables / Total Credit Purchases) * 30 days
  const dpoDays = totalCredit > 0 ? Math.round((totalPositivePayables / totalCredit) * 30) : 0;

  // C. Top 3 Vendor Concentration Ratio (CR3)
  const sortedByBalance = [...vendors].sort((a, b) => b.closingBalance - a.closingBalance);
  const top3PayablesSum = sortedByBalance.slice(0, 3).reduce((s, v) => s + Math.max(0, v.closingBalance), 0);
  const top3ConcentrationPct = totalPositivePayables > 0 ? Math.round((top3PayablesSum / totalPositivePayables) * 100) : 0;
  const topVendor = sortedByBalance[0];

  // --- 3. BALANCE TIER DISTRIBUTION CHART DATA ---
  const balanceTiers = [
    { tier: '< ₹50k', amount: vendors.filter(v => v.closingBalance > 0 && v.closingBalance < 50000).reduce((s, v) => s + v.closingBalance, 0), count: vendors.filter(v => v.closingBalance > 0 && v.closingBalance < 50000).length, fill: '#10b981' },
    { tier: '₹50k - ₹2L', amount: vendors.filter(v => v.closingBalance >= 50000 && v.closingBalance < 200000).reduce((s, v) => s + v.closingBalance, 0), count: vendors.filter(v => v.closingBalance >= 50000 && v.closingBalance < 200000).length, fill: '#3b82f6' },
    { tier: '₹2L - ₹5L', amount: vendors.filter(v => v.closingBalance >= 200000 && v.closingBalance < 500000).reduce((s, v) => s + v.closingBalance, 0), count: vendors.filter(v => v.closingBalance >= 200000 && v.closingBalance < 500000).length, fill: '#f59e0b' },
    { tier: '> ₹5L', amount: vendors.filter(v => v.closingBalance >= 500000).reduce((s, v) => s + v.closingBalance, 0), count: vendors.filter(v => v.closingBalance >= 500000).length, fill: '#f43f5e' },
  ];

  // --- 4. TOP VENDORS DONUT CHART DATA ---
  const top5Vendors = sortedByBalance.filter(v => v.closingBalance > 0).slice(0, 5);
  const pieColors = ['#ea580c', '#f59e0b', '#10b981', '#6366f1', '#a855f7'];

  // --- 5. SEARCH, SORT & TAB FILTERING ---
  const filteredVendors = vendors.filter(v => {
    if (activeTabFilter === 'high_exposure' && v.closingBalance < 100000) return false;
    if (activeTabFilter === 'unsettled' && (v.debit > 0 || v.closingBalance <= 0)) return false;
    if (activeTabFilter === 'advances' && v.closingBalance >= 0) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return v.name.toLowerCase().includes(q);
  });

  const sortedVendors = [...filteredVendors].sort((a, b) => {
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

  const totalPages = Math.max(1, Math.ceil(sortedVendors.length / pageSize));
  const paginatedVendors = sortedVendors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatBalance = (val: number) => {
    if (val === 0) return '₹0.00 Cr';
    const numStr = Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val < 0) return `₹${numStr} Dr`;
    return `₹${numStr} Cr`;
  };

  const formatCurrency = (val: number) => {
    return `₹${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportPayablesCSV = () => {
    if (!filteredVendors.length) return;
    const headers = ['Particulars / Vendor Name', 'Opening Balance', 'Debit (Payments Cleared)', 'Credit (Purchases Added)', 'Closing Balance', 'Risk Exposure'];
    const rows = filteredVendors.map(v => [
      `"${v.name.replace(/"/g, '""')}"`,
      v.openingBalance,
      v.debit,
      v.credit,
      v.closingBalance,
      v.riskRating
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payables_ledger_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!loading && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="No Payables Data"
          description="Upload Sundry Creditors or purchase vouchers to view vendor opening balances, debit/credit transactions, payment settlement efficiency, and supplier exposure."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
        <QuickUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          defaultDatasetType="payables"
          pageTitle="Accounts Payable"
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
            <CreditCard className="w-6 h-6 text-orange-600 dark:text-orange-500" />
            <span>Accounts Payable Intelligence Board</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Real-time Creditors Audit, Payment Settlement Efficiency (PSE), DPO Credit Terms &amp; Supplier Dependency
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SnapshotSelector
            moduleTitle="Payables Transactions"
            snapshots={snapshots}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={handleSelectSnapshot}
          />

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 transition self-start md:self-auto shrink-0 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Payables Data</span>
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
          title="Total Net Payables"
          value={formatBalance(totalClosing)}
          isCurrency={false}
          icon={CreditCard}
          gradientClass="kpi-gradient-orange"
          iconColor="text-orange-500"
        />
        <KpiCard
          title="Payment Settlement (PSE)"
          value={`${paymentEfficiencyPct}%`}
          isCurrency={false}
          icon={Percent}
          gradientClass="kpi-gradient-emerald"
          iconColor="text-emerald-500"
        />
        <KpiCard
          title="Estimated DPO (Days)"
          value={`${dpoDays} Days`}
          isCurrency={false}
          icon={Activity}
          gradientClass="kpi-gradient-blue"
          iconColor="text-blue-500"
        />
        <KpiCard
          title="Advances Paid to Vendors"
          value={formatCurrency(totalAdvancePaid)}
          isCurrency={false}
          icon={Truck}
          gradientClass="kpi-gradient-purple"
          iconColor="text-purple-500"
        />
        <KpiCard
          title="Top 3 Vendor Concentration"
          value={`${top3ConcentrationPct}%`}
          isCurrency={false}
          icon={ShieldAlert}
          gradientClass="kpi-gradient-amber"
          iconColor="text-amber-500"
        />
      </div>

      {/* SECTION 2: RISK & RECOVERY BRIEFING CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supplier Concentration Risk Alert Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              <span>Supplier Concentration Risk</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${top3ConcentrationPct > 60 ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'}`}>
              {top3ConcentrationPct > 60 ? 'High Vendor Dependency' : 'Balanced Vendor Spread'}
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-stone-900 dark:text-white font-mono">
              {top3ConcentrationPct}% <span className="text-xs font-medium text-stone-500">in Top 3 Suppliers</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Top Supplier Owed: <strong className="text-stone-800 dark:text-stone-200">{topVendor?.name || 'N/A'}</strong> ({formatBalance(topVendor?.closingBalance || 0)})
            </p>
          </div>
        </div>

        {/* Total Payments Disbursed Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Total Payments Cleared</span>
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Disbursed
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(totalDebit)}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              New Purchases Added: <strong className="text-stone-800 dark:text-stone-200">{formatCurrency(totalCredit)}</strong>
            </p>
          </div>
        </div>

        {/* Supplier Advances Prepayments Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-purple-500" />
              <span>Vendor Advance Prepayments (Dr)</span>
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
              Prepaid Asset
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
              {formatCurrency(totalAdvancePaid)}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Vendors Prepaid: <strong className="text-stone-800 dark:text-stone-200">{vendors.filter(v => v.closingBalance < 0).length} Suppliers</strong>
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: VISUAL CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payables Balance Tier Bar Chart */}
        <div className="lg:col-span-2">
          <ChartCard title="Creditors Outstanding by Amount Range" subtitle="Color Bars = Total Outstanding Payables Owed per Amount Tier">
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={balanceTiers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} />
                <XAxis dataKey="tier" stroke="#78716c" fontSize={11} />
                <YAxis stroke="#78716c" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} labelStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Bar dataKey="amount" name="Payable Amount" radius={[6, 6, 0, 0]}>
                  {balanceTiers.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Top 5 Vendors Donut Share Chart */}
        <div>
          <ChartCard title="Top Vendors Share" subtitle="Pie Slices = % Share of Total Creditors Balance for Top 5 Suppliers">
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie data={top5Vendors} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="closingBalance" nameKey="name">
                  {top5Vendors.map((_, idx) => (
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

      {/* SECTION 4: CREDITORS LEDGER TABLE WITH TAB FILTERS, SEARCH & EXPORT */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row items-center justify-between gap-3 bg-stone-50/50 dark:bg-stone-950/40">
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              <span>Sundry Creditors Accounts Payable Ledger</span>
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Opening Balance + Credit - Debit = Closing Balance (Direct from Tally Excel)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Quick Filter Tabs */}
            <div className="flex items-center p-1 bg-stone-200/60 dark:bg-stone-800 rounded-xl text-xs">
              <button
                onClick={() => { setActiveTabFilter('all'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${activeTabFilter === 'all' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'}`}
              >
                All ({vendors.length})
              </button>
              <button
                onClick={() => { setActiveTabFilter('high_exposure'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${activeTabFilter === 'high_exposure' ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'}`}
              >
                High Exposure (&gt;₹1L)
              </button>
              <button
                onClick={() => { setActiveTabFilter('unsettled'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${activeTabFilter === 'unsettled' ? 'bg-white dark:bg-stone-900 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'}`}
              >
                Unsettled / No Payment
              </button>
              <button
                onClick={() => { setActiveTabFilter('advances'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${activeTabFilter === 'advances' ? 'bg-white dark:bg-stone-900 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'}`}
              >
                Advances (Dr)
              </button>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search Vendor..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            {/* Export CSV Button */}
            <button
              onClick={exportPayablesCSV}
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
                    <span>Particulars / Vendor Name</span>
                    {sortField === 'name' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th onClick={() => handleSort('riskRating')} className="py-3 px-4 text-center cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-center gap-1">
                    <span>Exposure Status</span>
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
              {paginatedVendors.map(v => (
                <tr key={v.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
                  <td className="py-3 px-4 font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>{v.name}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      v.riskRating === 'Advance' ? 'text-purple-500 bg-purple-500/10 border-purple-500/20' :
                      v.riskRating === 'High' ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' :
                      v.riskRating === 'Moderate' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                      'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      {v.riskRating}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-stone-600 dark:text-stone-400">
                    {v.openingBalance !== 0 ? formatBalance(v.openingBalance) : ''}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {v.debit !== 0 ? formatCurrency(v.debit) : ''}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {v.credit !== 0 ? formatCurrency(v.credit) : ''}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                    {v.closingBalance !== 0 ? formatBalance(v.closingBalance) : ''}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Grand Total Row */}
            <tfoot className="bg-stone-100/90 dark:bg-stone-950 font-extrabold text-stone-900 dark:text-white border-t-2 border-orange-500/40">
              <tr>
                <td className="py-3.5 px-4 text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Grand Total ({filteredVendors.length} Vendors)
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
              <span className="font-bold text-stone-900 dark:text-white">{Math.min(currentPage * pageSize, filteredVendors.length)}</span> of{' '}
              <span className="font-bold text-stone-900 dark:text-white">{filteredVendors.length}</span> Vendors
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
        defaultDatasetType="payables"
        pageTitle="Accounts Payable"
        onImportSuccess={(newSnapId) => loadData(newSnapId)}
      />
    </div>
  );
}
