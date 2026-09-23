'use client';

import React, { useState, useEffect } from 'react';
import {
  getLatestSnapshotForModule,
  getSnapshotTransactions,
} from '@/lib/storage';
import { FinancialTransaction, FinancialSnapshot } from '@/types';
import { calculateMonthlyTrends, parseMonthAndYear } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import {
  DollarSign,
  TrendingUp,
  PieChart as PieIcon,
  Receipt,
  Clock,
  CreditCard,
  Sparkles,
  ShoppingBag,
  Users,
  Building2,
  Percent,
  Activity,
  ShieldAlert,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Layers,
  BarChart3,
  Globe
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';

export default function ExecutiveSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<{ snap: FinancialSnapshot | null; txns: FinancialTransaction[] }>({ snap: null, txns: [] });
  const [purchasesData, setPurchasesData] = useState<{ snap: FinancialSnapshot | null; txns: FinancialTransaction[] }>({ snap: null, txns: [] });
  const [receivablesData, setReceivablesData] = useState<{ snap: FinancialSnapshot | null; txns: FinancialTransaction[] }>({ snap: null, txns: [] });
  const [payablesData, setPayablesData] = useState<{ snap: FinancialSnapshot | null; txns: FinancialTransaction[] }>({ snap: null, txns: [] });
  const [paymentsData, setPaymentsData] = useState<{ snap: FinancialSnapshot | null; txns: FinancialTransaction[] }>({ snap: null, txns: [] });

  const loadAllModuleSummaries = async () => {
    setLoading(true);

    try {
      const [salesSnap, purchasesSnap, receivablesSnap, payablesSnap, paymentsSnap] = await Promise.all([
        getLatestSnapshotForModule('sales'),
        getLatestSnapshotForModule('purchases'),
        getLatestSnapshotForModule('receivables'),
        getLatestSnapshotForModule('payables'),
        getLatestSnapshotForModule('payments'),
      ]);

      const [salesTxns, purchasesTxns, receivablesTxns, payablesTxns, paymentsTxns] = await Promise.all([
        salesSnap ? getSnapshotTransactions(salesSnap.id, 'sales') : Promise.resolve([]),
        purchasesSnap ? getSnapshotTransactions(purchasesSnap.id, 'purchases') : Promise.resolve([]),
        receivablesSnap ? getSnapshotTransactions(receivablesSnap.id, 'receivables') : Promise.resolve([]),
        payablesSnap ? getSnapshotTransactions(payablesSnap.id, 'payables') : Promise.resolve([]),
        paymentsSnap ? getSnapshotTransactions(paymentsSnap.id, 'payments') : Promise.resolve([]),
      ]);

      setSalesData({ snap: salesSnap, txns: salesTxns });
      setPurchasesData({ snap: purchasesSnap, txns: purchasesTxns });
      setReceivablesData({ snap: receivablesSnap, txns: receivablesTxns });
      setPayablesData({ snap: payablesSnap, txns: payablesTxns });
      setPaymentsData({ snap: paymentsSnap, txns: paymentsTxns });
    } catch (err) {
      console.error('Failed to load executive master summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllModuleSummaries();
  }, []);

  // --- 1. CONSOLIDATED SALES SUMMARY ---
  const totalSales = salesData.txns.reduce((s, t) => s + (t.grossTotal || t.saleAmount || t.totalAmount || t.amount || 0), 0);
  const salesCount = salesData.txns.length;
  const avgSalesInvoice = salesCount > 0 ? totalSales / salesCount : 0;

  // --- 2. CONSOLIDATED PURCHASES SUMMARY ---
  const totalPurchases = purchasesData.txns.reduce((s, t) => s + (t.grossTotal || t.totalAmount || t.value || t.amount || 0), 0);
  const totalIGST = purchasesData.txns.reduce((s, t) => s + (t.igst || 0), 0);
  const totalCGST = purchasesData.txns.reduce((s, t) => s + (t.cgst || 0), 0);
  const totalSGST = purchasesData.txns.reduce((s, t) => s + (t.sgst || 0), 0);
  const totalGSTClaimable = totalIGST + totalCGST + totalSGST;
  const totalFreight = purchasesData.txns.reduce((s, t) => s + (t.transportationCharges || 0), 0);

  // --- 3. CONSOLIDATED RECEIVABLES (DEBTORS) SUMMARY ---
  const recSnap = receivablesData.snap;
  const totalReceivables = recSnap?.grandTotalClosing ?? receivablesData.txns.reduce((s, t) => s + (t.closingBalance || 0), 0);
  const recDebit = recSnap?.grandTotalDebit ?? receivablesData.txns.reduce((s, t) => s + (t.debit || 0), 0);
  const recCredit = recSnap?.grandTotalCredit ?? receivablesData.txns.reduce((s, t) => s + (t.credit || 0), 0);
  const recBase = (recSnap?.grandTotalOpening || 0) + recDebit;
  const ceiPct = recBase > 0 ? Math.round((recCredit / recBase) * 100) : 0;
  const dsoDays = recDebit > 0 ? Math.round((Math.max(0, totalReceivables) / recDebit) * 30) : 0;

  // --- 4. CONSOLIDATED PAYABLES (CREDITORS) SUMMARY ---
  const paySnap = payablesData.snap;
  const totalPayables = paySnap?.grandTotalClosing ?? payablesData.txns.reduce((s, t) => s + (t.closingBalance || 0), 0);
  const payDebit = paySnap?.grandTotalDebit ?? payablesData.txns.reduce((s, t) => s + (t.debit || 0), 0);
  const payCredit = paySnap?.grandTotalCredit ?? payablesData.txns.reduce((s, t) => s + (t.credit || 0), 0);
  const payBase = (paySnap?.grandTotalOpening || 0) + payCredit;
  const psePct = payBase > 0 ? Math.round((payDebit / payBase) * 100) : 0;
  const dpoDays = payCredit > 0 ? Math.round((Math.max(0, totalPayables) / payCredit) * 30) : 0;

  // --- 5. PROFITABILITY METRICS ---
  const grossProfit = totalSales - totalPurchases;
  const grossMarginPct = totalSales > 0 ? Math.round(((totalSales - totalPurchases) / totalSales) * 100) : 0;

  // --- 6. MONTHLY CONSOLIDATED TRENDS ---
  const allTxns = [...salesData.txns, ...purchasesData.txns];
  const monthlyTrends = calculateMonthlyTrends(allTxns);

  // --- 7. MODULE DISTRIBUTION DONUT CHART ---
  const moduleDistribution = [
    { name: 'Sales Revenue', value: totalSales, fill: '#ea580c' },
    { name: 'Procurement Spend', value: totalPurchases, fill: '#f59e0b' },
    { name: 'Accounts Receivable', value: Math.abs(totalReceivables), fill: '#10b981' },
    { name: 'Accounts Payable', value: Math.abs(totalPayables), fill: '#3b82f6' },
  ];

  const pieColors = ['#ea580c', '#f59e0b', '#10b981', '#3b82f6'];

  const fmtCurrency = (val: number) => {
    if (val === 0) return '₹0.00';
    return `₹${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtBalance = (val: number, type: 'dr' | 'cr') => {
    if (val === 0) return `₹0.00 ${type.toUpperCase()}`;
    const str = Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val < 0 ? `₹${str} ${type === 'dr' ? 'Cr' : 'Dr'}` : `₹${str} ${type.toUpperCase()}`;
  };

  const hasAnyData = salesData.txns.length > 0 || purchasesData.txns.length > 0 || receivablesData.txns.length > 0 || payablesData.txns.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title Header (Clean Executive Title without Upload Buttons) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-orange-600 dark:text-orange-500" />
            <span>Master Executive Financial Briefing</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Unified cross-module financial intelligence summarizing Sales, Purchases, Receivables, Payables &amp; Tax ITC
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
          <Activity className="w-4 h-4" />
          <span>Real-time Enterprise Audit</span>
        </div>
      </div>

      {!loading && !hasAnyData ? (
        <EmptyState
          title="No Module Data Available for Summary"
          description="Financial snapshots have not been uploaded yet. Upload data in Sales, Purchases, Receivables, or Payables module pages to view consolidated master executive analytics."
        />
      ) : (
        <>
          {/* SECTION 1: MASTER CONSOLIDATED KPIS (6 KEY PILLARS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard
              title="Total Sales Revenue"
              value={totalSales}
              icon={DollarSign}
              gradientClass="kpi-gradient-emerald"
              iconColor="text-emerald-500"
            />
            <KpiCard
              title="Procurement Outflow"
              value={totalPurchases}
              icon={ShoppingBag}
              gradientClass="kpi-gradient-orange"
              iconColor="text-orange-500"
            />
            <KpiCard
              title="Gross Margin"
              value={`${grossMarginPct}%`}
              isCurrency={false}
              icon={TrendingUp}
              gradientClass="kpi-gradient-purple"
              iconColor="text-purple-500"
            />
            <KpiCard
              title="Net Receivables (Debtors)"
              value={fmtBalance(totalReceivables, 'dr')}
              isCurrency={false}
              icon={Clock}
              gradientClass="kpi-gradient-amber"
              iconColor="text-amber-500"
            />
            <KpiCard
              title="Net Payables (Creditors)"
              value={fmtBalance(totalPayables, 'cr')}
              isCurrency={false}
              icon={CreditCard}
              gradientClass="kpi-gradient-blue"
              iconColor="text-blue-500"
            />
            <KpiCard
              title="Claimable GST ITC"
              value={totalGSTClaimable}
              icon={Receipt}
              gradientClass="kpi-gradient-emerald"
              iconColor="text-emerald-400"
            />
          </div>

          {/* SECTION 2: 4 MODULE SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sales & Revenue Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Sales &amp; Revenue</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {salesCount} Invoices
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {fmtCurrency(totalSales)}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  Average Order Value: <strong className="text-stone-800 dark:text-stone-200">{fmtCurrency(avgSalesInvoice)}</strong>
                </p>
              </div>
            </div>

            {/* Procurement & Purchases Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-orange-500" />
                  <span>Procurement Outflow</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/10 text-orange-600 border border-orange-500/20">
                  {purchasesData.txns.length} Vouchers
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">
                  {fmtCurrency(totalPurchases)}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  Freight &amp; Logistics: <strong className="text-stone-800 dark:text-stone-200">{fmtCurrency(totalFreight)}</strong>
                </p>
              </div>
            </div>

            {/* Accounts Receivable Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Accounts Receivable</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  CEI: {ceiPct}%
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {fmtBalance(totalReceivables, 'dr')}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  Estimated DSO: <strong className="text-stone-800 dark:text-stone-200">{dsoDays} Days</strong>
                </p>
              </div>
            </div>

            {/* Accounts Payable Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <span>Accounts Payable</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  PSE: {psePct}%
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                  {fmtBalance(totalPayables, 'cr')}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  Estimated DPO: <strong className="text-stone-800 dark:text-stone-200">{dpoDays} Days</strong>
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: CHARTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales vs Procurement Outflow Area Chart */}
            <div className="lg:col-span-2">
              <ChartCard
                title="Consolidated Financial Trajectory"
                subtitle="🟠 Solid Line = Billed Sales Revenue  |  🟡 Light Line = Procurement Outflow (Purchases)"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyTrends}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} />
                    <XAxis dataKey="month" stroke="#78716c" fontSize={11} />
                    <YAxis stroke="#78716c" fontSize={11} tickFormatter={val => `₹${val / 1000}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                      labelStyle={{ color: '#ffffff', fontWeight: 700 }}
                      formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                    />
                    <Legend formatter={(value) => <span className="text-stone-700 dark:text-stone-300 font-bold text-[11px]">{value}</span>} />
                    <Area type="monotone" dataKey="sales" name="Billed Sales Revenue (Orange Line)" stroke="#ea580c" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                    <Area type="monotone" dataKey="purchases" name="Procurement Outflow (Amber Line)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPurchases)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Consolidated Module Share Donut Chart */}
            <div>
              <ChartCard
                title="Enterprise Value Distribution"
                subtitle="Percentage share across Revenue, Purchases &amp; Balances"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={moduleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {moduleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                      labelStyle={{ color: '#ffffff', fontWeight: 700 }}
                      formatter={(val: any) => `₹${Number(val).toLocaleString('en-IN')}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(value) => <span className="text-stone-700 dark:text-stone-300 font-bold text-[11px]">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
