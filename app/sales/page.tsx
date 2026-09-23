'use client';

import React, { useState, useEffect } from 'react';
import { getSnapshotsForModule, getSnapshotTransactions } from '@/lib/storage';
import { FinancialTransaction, FinancialSnapshot } from '@/types';
import { calculateKPIs, calculateCustomerSummaries, calculateMonthlyTrends } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { SnapshotSelector } from '@/components/dashboard/SnapshotSelector';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { TrendingUp, DollarSign, Award, ShoppingBag, UploadCloud, Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

export default function SalesPage() {
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
    const snaps = await getSnapshotsForModule('sales');
    setSnapshots(snaps);

    const activeId = targetSnapshotId || selectedSnapshotId || (snaps.length > 0 ? snaps[0].id : null);
    setSelectedSnapshotId(activeId);

    if (activeId) {
      const txns = await getSnapshotTransactions(activeId, 'sales');
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

  // Filter transactions based on search query
  const filteredTxns = activeTxns.filter(t => {
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

  // Calculate totals for all 10 numeric columns
  const grandTotals = filteredTxns.reduce(
    (acc, t) => {
      acc.quantity += t.quantity || 0;
      acc.value += t.value || 0;
      acc.grossTotal += t.grossTotal || t.totalAmount || t.amount || 0;
      acc.sale += t.saleAmount || t.amount || 0;
      acc.igst += t.igst || 0;
      acc.roundOff += t.roundOff || 0;
      acc.cgst += t.cgst || 0;
      acc.sgst += t.sgst || 0;
      acc.workContract += t.workContract || 0;
      acc.transportationCharges += t.transportationCharges || 0;
      return acc;
    },
    {
      quantity: 0,
      value: 0,
      grossTotal: 0,
      sale: 0,
      igst: 0,
      roundOff: 0,
      cgst: 0,
      sgst: 0,
      workContract: 0,
      transportationCharges: 0,
    }
  );

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

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(sortedTxns.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedTxns.slice(startIndex, startIndex + pageSize);

  const exportSalesCSV = () => {
    if (!filteredTxns.length) return;
    const headers = [
      'Date',
      'Particulars',
      'Voucher Type',
      'Voucher No.',
      'Voucher Ref. No.',
      'GSTIN/UIN',
      'PAN No.',
      'Quantity',
      'Value',
      'Gross Total',
      'Sale',
      'IGST',
      'Round Off',
      'CGST',
      'SGST',
      'Work Contract',
      'Transportation Charges',
    ];

    const rows = filteredTxns.map(t => [
      t.date || '',
      `"${(t.partyName || '').replace(/"/g, '""')}"`,
      `"${t.voucherType || ''}"`,
      `"${t.voucherNo || ''}"`,
      `"${t.voucherRefNo || ''}"`,
      `"${t.gstin || ''}"`,
      `"${t.panNo || ''}"`,
      t.quantity || 0,
      t.value || 0,
      t.grossTotal || t.totalAmount || 0,
      t.saleAmount || t.amount || 0,
      t.igst || 0,
      t.roundOff || 0,
      t.cgst || 0,
      t.sgst || 0,
      t.workContract || 0,
      t.transportationCharges || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_vouchers_export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!loading && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="No Sales Data Available"
          description="Upload a Tally Sales Voucher export file to view sales trends, tax details, and voucher breakdown."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
        <QuickUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          defaultDatasetType="sales"
          pageTitle="Sales Board"
          onImportSuccess={(newSnapId) => loadData(newSnapId)}
        />
      </div>
    );
  }

  const kpis = calculateKPIs(activeTxns);
  const customers = calculateCustomerSummaries(activeTxns);
  const monthlyTrends = calculateMonthlyTrends(activeTxns);

  const topCust = customers[0]?.name || 'N/A';
  const avgInv = activeTxns.length > 0 ? kpis.totalSales / activeTxns.length : 0;

  const categoryMap = new Map<string, number>();
  activeTxns.forEach(t => {
    const cat = t.itemCategory || 'General Sales';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (t.saleAmount || t.totalAmount || t.amount));
  });
  const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

  const pieColors = ['#ea580c', '#f59e0b', '#10b981', '#a855f7', '#f43f5e'];

  const fmtCurrency = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0.00';
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-500" />
            <span>Sales Dashboard (<code className="text-orange-600 dark:text-orange-500 text-lg">sales_transactions</code>)</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Displaying exact 17 column Tally Sales Vouchers stored safely in <code className="text-orange-600 font-bold">sales_transactions</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SnapshotSelector
            moduleTitle="Sales Transactions"
            snapshots={snapshots}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={handleSelectSnapshot}
          />

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 transition self-start sm:self-auto shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Sales Excel</span>
          </button>
        </div>
      </div>

      {/* Date Range Calendar Filter with 15-Day Presets & Out-of-Range Alerts */}
      <DateRangePicker
        transactions={transactions}
        onDateRangeChange={(filtered) => setDateFilteredTxns(filtered)}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Gross Sales" value={kpis.totalSales} changePct={14.8} icon={DollarSign} gradientClass="kpi-gradient-emerald" iconColor="text-emerald-500" />
        <KpiCard title="Total Sales Invoices" value={transactions.length} isCurrency={false} icon={UploadCloud} gradientClass="kpi-gradient-orange" iconColor="text-orange-500" />
        <KpiCard title="Average Invoice Value" value={avgInv} icon={ShoppingBag} gradientClass="kpi-gradient-purple" iconColor="text-purple-500" />
        <KpiCard title="Top Key Account" value={topCust} isCurrency={false} icon={Award} gradientClass="kpi-gradient-amber" iconColor="text-amber-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Monthly Revenue Growth" subtitle="🟠 Orange Line = Total Billed Sales Revenue per month">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} />
                <XAxis dataKey="month" stroke="#78716c" fontSize={11} />
                <YAxis stroke="#78716c" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} labelStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Line type="monotone" dataKey="sales" name="Gross Sales" stroke="#ea580c" strokeWidth={3} dot={{ r: 5, fill: '#ea580c' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={(value) => <span className="text-stone-700 dark:text-stone-300 font-bold text-[11px]">{value}</span>} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div>
          <ChartCard title="Sales by Product Category" subtitle="Pie Slices = Revenue distribution across product categories">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {categoryData.map((_, idx) => (
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

      {/* Top Customer Ranking */}
      <ChartCard title="Top 5 Customer Sales Ranking" subtitle="Orange Horizontal Bars = Revenue contribution by Top 5 Key Accounts">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={customers.slice(0, 5)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} />
            <XAxis type="number" stroke="#78716c" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
            <YAxis type="category" dataKey="name" stroke="#78716c" fontSize={11} width={140} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} labelStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
            <Bar dataKey="totalSales" name="Total Customer Sales" fill="#ea580c" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 17-COLUMN TALLY SALES TABLE */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl overflow-hidden">
        {/* Table Control Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50/50 dark:bg-stone-950/40">
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white tracking-wide flex items-center gap-2">
              <span>Sales Vouchers Register</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                17 Columns Exact
              </span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Showing {filteredTxns.length} records parsed from uploaded Tally Sales Voucher Excel
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
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
              onClick={exportSalesCSV}
              disabled={!filteredTxns.length}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Scrollable Table Grid */}
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
                <th onClick={() => handleSort('voucherRefNo')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1"><span>Voucher Ref. No.</span>{sortField === 'voucherRefNo' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('gstin')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1"><span>GSTIN/UIN</span>{sortField === 'gstin' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('panNo')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center gap-1"><span>PAN No.</span>{sortField === 'panNo' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
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
                <th onClick={() => handleSort('saleAmount')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>Sale</span>{sortField === 'saleAmount' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('igst')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>IGST</span>{sortField === 'igst' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('roundOff')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>Round Off</span>{sortField === 'roundOff' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('cgst')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>CGST</span>{sortField === 'cgst' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('sgst')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>SGST</span>{sortField === 'sgst' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('workContract')} className="py-3 px-3 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>Work Contract</span>{sortField === 'workContract' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
                <th onClick={() => handleSort('transportationCharges')} className="py-3 px-3 bg-stone-100 dark:bg-stone-950 text-right cursor-pointer hover:text-orange-500 transition">
                  <div className="flex items-center justify-end gap-1"><span>Transportation Charges</span>{sortField === 'transportationCharges' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-8 text-center text-stone-400 font-medium">
                    No sales transaction records found matching your filter criteria.
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
                        {t.voucherType || 'Sales'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 font-semibold font-mono text-stone-800 dark:text-stone-200">
                      {t.voucherNo}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-stone-500 font-mono text-[11px]">
                      {t.voucherRefNo || '-'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-mono text-[11px]">
                      {t.gstin || '-'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-mono text-[11px]">
                      {t.panNo || '-'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-stone-700 dark:text-stone-300">
                      {(t.quantity || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-stone-800 dark:text-stone-200 font-medium">
                      {fmtCurrency(t.value)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono font-bold text-orange-600 dark:text-orange-400">
                      {fmtCurrency(t.grossTotal || t.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {fmtCurrency(t.saleAmount || t.amount)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-stone-600 dark:text-stone-400">
                      {fmtCurrency(t.igst)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-stone-500">
                      {fmtCurrency(t.roundOff)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-stone-600 dark:text-stone-400">
                      {fmtCurrency(t.cgst)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-stone-600 dark:text-stone-400">
                      {fmtCurrency(t.sgst)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-200 dark:border-stone-800 text-right font-mono text-stone-600 dark:text-stone-400">
                      {fmtCurrency(t.workContract)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-600 dark:text-stone-400">
                      {fmtCurrency(t.transportationCharges)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* GRAND TOTAL FOOTER */}
            {filteredTxns.length > 0 && (
              <tfoot className="bg-stone-100 dark:bg-stone-950 font-black text-xs border-t-2 border-stone-300 dark:border-stone-700 uppercase tracking-wide">
                <tr className="bg-orange-500/10 dark:bg-orange-500/10 text-stone-900 dark:text-white">
                  <td colSpan={7} className="py-3 px-3 text-right border-r border-stone-300 dark:border-stone-700 font-black text-orange-600 dark:text-orange-400">
                    Grand Total ({filteredTxns.length} Records):
                  </td>
                  <td className="py-3 px-3 text-right border-r border-stone-300 dark:border-stone-700 font-mono">
                    {grandTotals.quantity.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right border-r border-stone-300 dark:border-stone-700 font-mono">
                    {fmtCurrency(grandTotals.value)}
                  </td>
                  <td className="py-3 px-3 text-right border-r border-stone-300 dark:border-stone-700 font-mono text-orange-600 dark:text-orange-400 text-sm">
                    {fmtCurrency(grandTotals.grossTotal)}
                  </td>
                  <td className="py-3 px-3 text-right border-r border-stone-300 dark:border-stone-700 font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {fmtCurrency(grandTotals.sale)}
                  </td>
                  <td className="py-3 px-3 text-right border-r border-stone-300 dark:border-stone-700 font-mono">
                    {fmtCurrency(grandTotals.igst)}
                  </td>
                  <td className="py-3 px-3 text-right border-r border-stone-300 dark:border-stone-700 font-mono">
                    {fmtCurrency(grandTotals.roundOff)}
                  </td>
                  <td className="py-3 px-3 text-right border-r border-stone-300 dark:border-stone-700 font-mono">
                    {fmtCurrency(grandTotals.cgst)}
                  </td>
                  <td className="py-3 px-3 text-right border-r border-stone-300 dark:border-stone-700 font-mono">
                    {fmtCurrency(grandTotals.sgst)}
                  </td>
                  <td className="py-3 px-3 text-right border-r border-stone-300 dark:border-stone-700 font-mono">
                    {fmtCurrency(grandTotals.workContract)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {fmtCurrency(grandTotals.transportationCharges)}
                  </td>
                </tr>
              </tfoot>
            )}
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
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 disabled:opacity-40 text-stone-800 dark:text-stone-200 font-bold transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 disabled:opacity-40 text-stone-800 dark:text-stone-200 font-bold transition"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Upload Modal */}
      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="sales"
        pageTitle="Sales Board"
        onImportSuccess={(newSnapId) => loadData(newSnapId)}
      />
    </div>
  );
}

