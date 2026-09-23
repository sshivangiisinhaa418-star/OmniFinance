'use client';

import React, { useState, useEffect } from 'react';
import { getSnapshotsForModule, getSnapshotTransactions } from '@/lib/storage';
import { FinancialTransaction, FinancialSnapshot } from '@/types';
import { calculateKPIs } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { SnapshotSelector } from '@/components/dashboard/SnapshotSelector';
import { FileCheck2, ShieldCheck, DollarSign, ArrowUpRight, ArrowDownRight, UploadCloud } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export default function TaxGstPage() {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const loadData = async (targetSnapshotId?: string) => {
    setLoading(true);
    const snaps = await getSnapshotsForModule('tax');
    setSnapshots(snaps);

    const activeId = targetSnapshotId || selectedSnapshotId || (snaps.length > 0 ? snaps[0].id : null);
    setSelectedSnapshotId(activeId);

    if (activeId) {
      const txns = await getSnapshotTransactions(activeId, 'tax');
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
    loadData(snap.id);
  };

  const kpis = calculateKPIs(transactions);

  let outputCGST = 0, outputSGST = 0, outputIGST = 0;
  let inputCGST = 0, inputSGST = 0, inputIGST = 0;

  transactions.forEach(t => {
    const isSales = t.voucherType.toLowerCase().includes('sales');
    const isPur = t.voucherType.toLowerCase().includes('purchase');

    if (isSales) {
      outputCGST += t.cgst || 0;
      outputSGST += t.sgst || 0;
      outputIGST += t.igst || 0;
    } else if (isPur) {
      inputCGST += t.cgst || 0;
      inputSGST += t.sgst || 0;
      inputIGST += t.igst || 0;
    }
  });

  const totalOutput = outputCGST + outputSGST + outputIGST;
  const totalInput = inputCGST + inputSGST + inputIGST;
  const netPayable = Math.max(0, totalOutput - totalInput);

  const gstChartData = [
    { type: 'CGST', OutputTax: outputCGST, InputCredit: inputCGST },
    { type: 'SGST', OutputTax: outputSGST, InputCredit: inputSGST },
    { type: 'IGST', OutputTax: outputIGST, InputCredit: inputIGST },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-orange-600 dark:text-emerald-400" />
            <span>Tax & GST Transactions (<code className="text-orange-600 dark:text-emerald-400 text-lg">tax_gst_transactions</code>)</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Output Liability vs Input Tax Credit (ITC) breakdown stored in <code className="text-orange-600 font-bold">tax_gst_transactions</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SnapshotSelector
            moduleTitle="Tax & GST Transactions"
            snapshots={snapshots}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={handleSelectSnapshot}
          />

          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/20 transition cursor-pointer self-start md:self-auto shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Tax / GST Register</span>
          </button>
        </div>
      </div>

      {!loading && transactions.length === 0 ? (
        <EmptyState
          title="No Tax / GST Data Available"
          description="Upload sales and purchase vouchers with tax details to view CGST, SGST, IGST, and Input Tax Credit (ITC)."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total Output Tax (Collected)" value={totalOutput} icon={ArrowUpRight} gradientClass="kpi-gradient-rose" iconColor="text-rose-400" />
            <KpiCard title="Input Tax Credit (ITC)" value={totalInput} icon={ArrowDownRight} gradientClass="kpi-gradient-emerald" iconColor="text-emerald-400" />
            <KpiCard title="Net GST Liability Payable" value={netPayable} icon={DollarSign} gradientClass="kpi-gradient-blue" iconColor="text-blue-400" />
            <KpiCard title="ITC Utilization Ratio" value={`${totalOutput > 0 ? Math.round((totalInput / totalOutput) * 100) : 0}%`} isCurrency={false} icon={ShieldCheck} gradientClass="kpi-gradient-purple" iconColor="text-purple-400" />
          </div>

          <ChartCard title="GST Liability vs Input Tax Credit (ITC)" subtitle="Breakdown across CGST, SGST, and IGST heads">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={gstChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="type" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="OutputTax" name="Output Tax Liability" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="InputCredit" name="Input Tax Credit (ITC)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="tax"
        pageTitle="Tax & GST Compliance"
        onImportSuccess={(newSnapId) => loadData(newSnapId)}
      />
    </div>
  );
}
