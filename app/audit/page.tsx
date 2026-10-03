'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getActiveTransactionsForModule } from '@/lib/storage';
import { FinancialTransaction } from '@/types';
import { AuditHealthSummary, runFinancialAuditScan, AuditIssue } from '@/lib/finance/auditScanner';
import { AuditHealthCard } from '@/components/dashboard/AuditHealthCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  FileCheck2,
  AlertTriangle,
  AlertCircle,
  Info,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  Award,
  Zap,
  BarChart3,
  PieChart
} from 'lucide-react';

export default function AuditCenterPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [salesTxns, setSalesTxns] = useState<FinancialTransaction[]>([]);
  const [purchasesTxns, setPurchasesTxns] = useState<FinancialTransaction[]>([]);
  const [receivablesTxns, setReceivablesTxns] = useState<FinancialTransaction[]>([]);
  const [payablesTxns, setPayablesTxns] = useState<FinancialTransaction[]>([]);
  const [paymentsTxns, setPaymentsTxns] = useState<FinancialTransaction[]>([]);
  const [receiptsTxns, setReceiptsTxns] = useState<FinancialTransaction[]>([]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const [sales, purchases, receivables, payables, payments, receipts] = await Promise.all([
        getActiveTransactionsForModule('sales'),
        getActiveTransactionsForModule('purchases'),
        getActiveTransactionsForModule('receivables'),
        getActiveTransactionsForModule('payables'),
        getActiveTransactionsForModule('payments'),
        getActiveTransactionsForModule('receipts'),
      ]);

      setSalesTxns(sales);
      setPurchasesTxns(purchases);
      setReceivablesTxns(receivables);
      setPayablesTxns(payables);
      setPaymentsTxns(payments);
      setReceiptsTxns(receipts);
    } catch (err) {
      console.error('Failed to load audit scan data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  const auditSummary: AuditHealthSummary = useMemo(() => {
    return runFinancialAuditScan({
      sales: salesTxns,
      purchases: purchasesTxns,
      receivables: receivablesTxns,
      payables: payablesTxns,
      payments: paymentsTxns,
      receipts: receiptsTxns,
    });
  }, [salesTxns, purchasesTxns, receivablesTxns, payablesTxns, paymentsTxns, receiptsTxns]);

  const totalVouchersScanned = salesTxns.length + purchasesTxns.length + receivablesTxns.length + payablesTxns.length + paymentsTxns.length + receiptsTxns.length;
  const compliantVouchersCount = Math.max(0, totalVouchersScanned - auditSummary.totalIssuesCount);
  const compliancePct = totalVouchersScanned > 0 ? ((compliantVouchersCount / totalVouchersScanned) * 100).toFixed(1) : '100.0';

  const severityChartData = useMemo(() => {
    const high = auditSummary.issues.filter((i: AuditIssue) => i.severity === 'critical').reduce((acc: number, curr: AuditIssue) => acc + curr.affectedCount, 0);
    const medium = auditSummary.issues.filter((i: AuditIssue) => i.severity === 'warning').reduce((acc: number, curr: AuditIssue) => acc + curr.affectedCount, 0);
    const low = auditSummary.issues.filter((i: AuditIssue) => i.severity === 'info').reduce((acc: number, curr: AuditIssue) => acc + curr.affectedCount, 0);
    const compliant = Math.max(0, totalVouchersScanned - (high + medium + low));

    return [
      { name: 'Compliant Vouchers', count: compliant, fill: '#10b981' },
      { name: 'Medium Risk Issues', count: medium, fill: '#f59e0b' },
      { name: 'High Risk Anomalies', count: high, fill: '#ef4444' },
    ];
  }, [auditSummary, totalVouchersScanned]);

  const categoryChartData = useMemo(() => {
    if (!auditSummary.issues.length) return [];
    return auditSummary.issues.map((issue: AuditIssue) => ({
      name: issue.title.length > 20 ? issue.title.substring(0, 18) + '...' : issue.title,
      impact: issue.totalImpactAmount || 0,
      count: issue.affectedCount,
    }));
  }, [auditSummary]);

  const downloadAuditReportCSV = () => {
    if (!auditSummary.issues.length) return;
    const headers = ['Category', 'Severity', 'Title', 'Description', 'Affected Count', 'Impact Amount (INR)', 'Auditor Recommendation'];
    const rows = auditSummary.issues.map((i: AuditIssue) => [
      `"${i.category}"`,
      `"${i.severity.toUpperCase()}"`,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.description.replace(/"/g, '""')}"`,
      i.affectedCount,
      i.totalImpactAmount,
      `"${i.recommendation.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: (string | number)[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_audit_report_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-orange-600 dark:text-amber-400" />
            <span>AI Financial Audit &amp; Compliance Center</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Automated CA-grade compliance verification, tax slab validation &amp; voucher integrity audit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-xs font-mono font-bold px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
            {totalVouchersScanned} Vouchers Scanned
          </div>

          <button
            onClick={downloadAuditReportCSV}
            disabled={auditSummary.issues.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold rounded-xl shadow-sm hover:bg-stone-800 dark:hover:bg-white transition cursor-pointer disabled:opacity-40"
            title="Download full audit findings report to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit CSV</span>
          </button>

          <button
            onClick={loadAuditData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-run Audit Scan</span>
          </button>
        </div>
      </div>

      {/* Compliance Indicator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-sm shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Voucher Compliance</div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {compliancePct}% Compliant
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black text-sm shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">GST Slabs Scanned</div>
            <div className="text-base font-black text-stone-900 dark:text-white font-mono">
              5%, 12%, 18%, 28%
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-sm shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Duplicate Guard</div>
            <div className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
              Active Protection
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black text-sm shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Auditor Status</div>
            <div className="text-base font-black text-purple-600 dark:text-purple-400 font-mono">
              Grade {auditSummary.scoreGrade} ({auditSummary.healthScore}/100)
            </div>
          </div>
        </div>
      </div>

      {/* Informative Visual Charts Grid */}
      {!loading && totalVouchersScanned > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title="Audit Health & Anomaly Severity Distribution"
            subtitle="Count of compliant vouchers vs risk flags detected by automated scanner"
          >
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={severityChartData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.5} />
                <XAxis dataKey="name" stroke="#a8a29e" fontSize={11} tickLine={false} />
                <YAxis stroke="#a8a29e" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {severityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Financial Impact by Anomaly Category (₹)"
            subtitle="Estimated monetary exposure associated with flagged audit items"
          >
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={categoryChartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#a8a29e" fontSize={10} tickLine={false} />
                  <YAxis stroke="#a8a29e" fontSize={11} tickLine={false} tickFormatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                    formatter={(val: any) => `₹${Number(val).toLocaleString('en-IN')}`}
                  />
                  <Bar dataKey="impact" fill="#ea580c" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[230px] text-xs font-bold text-emerald-500 gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Zero Anomaly Financial Exposure Detected</span>
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-3">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
          <p className="text-xs font-bold text-stone-600 dark:text-stone-300">
            Scanning active datasets for GST tax mismatches, duplicate vouchers &amp; credit risks...
          </p>
        </div>
      ) : (
        <AuditHealthCard summary={auditSummary} onRefreshScan={loadAuditData} />
      )}
    </div>
  );
}

