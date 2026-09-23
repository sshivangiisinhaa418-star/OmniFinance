'use client';

import React, { useState, useEffect } from 'react';
import { getSnapshotsForModule, getSnapshotTransactions } from '@/lib/storage';
import { FinancialTransaction, FinancialSnapshot } from '@/types';
import { SAMPLE_STOCK_ITEMS } from '@/lib/sampleData/tallyGenerator';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { SnapshotSelector } from '@/components/dashboard/SnapshotSelector';
import { Package, ShieldCheck, TrendingUp, AlertTriangle, UploadCloud } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function InventoryPage() {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async (targetSnapshotId?: string) => {
    setLoading(true);
    const snaps = await getSnapshotsForModule('inventory');
    setSnapshots(snaps);

    const activeId = targetSnapshotId || selectedSnapshotId || (snaps.length > 0 ? snaps[0].id : null);
    setSelectedSnapshotId(activeId);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectSnapshot = (snap: FinancialSnapshot) => {
    setSelectedSnapshotId(snap.id);
    loadData(snap.id);
  };

  const stockItems = SAMPLE_STOCK_ITEMS;
  const totalVal = stockItems.reduce((acc, s) => acc + s.closingValue, 0);
  const totalQty = stockItems.reduce((acc, s) => acc + s.closingQty, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-600 dark:text-purple-400" />
            <span>Inventory Stock (<code className="text-orange-600 dark:text-purple-400 text-lg">inventory_stock</code>)</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Closing stock valuation, fast-moving items, and stock movement stored in <code className="text-orange-600 font-bold">inventory_stock</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SnapshotSelector
            moduleTitle="Inventory Stock"
            snapshots={snapshots}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={handleSelectSnapshot}
          />

          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/20 transition cursor-pointer self-start md:self-auto shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Stock Summary Data</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Stock Valuation" value={totalVal} icon={Package} gradientClass="kpi-gradient-purple" iconColor="text-purple-400" />
        <KpiCard title="Total Quantity in Hand" value={totalQty} isCurrency={false} icon={ShieldCheck} gradientClass="kpi-gradient-blue" iconColor="text-blue-400" />
        <KpiCard title="Stock Items Tracked" value={stockItems.length} isCurrency={false} icon={TrendingUp} gradientClass="kpi-gradient-emerald" iconColor="text-emerald-400" />
        <KpiCard title="Low Stock Alerts" value={0} isCurrency={false} icon={AlertTriangle} gradientClass="kpi-gradient-amber" iconColor="text-amber-400" />
      </div>

      <ChartCard title="Stock Item Closing Valuation" subtitle="Value distribution across stock items">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stockItems}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
            <Bar dataKey="closingValue" fill="#ea580c" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 glass-panel p-5 shadow-sm">
        <h4 className="text-sm font-bold text-stone-900 dark:text-white mb-4">Inventory Stock Ledger</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-950/60 text-stone-500 dark:text-stone-400 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Inward Qty</th>
                <th className="py-3 px-4 text-right">Outward Qty</th>
                <th className="py-3 px-4 text-right">Closing Qty</th>
                <th className="py-3 px-4 text-right">Closing Rate</th>
                <th className="py-3 px-4 text-right">Closing Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800/40">
              {stockItems.map(s => (
                <tr key={s.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
                  <td className="py-3 px-4 font-bold text-stone-900 dark:text-white">{s.name}</td>
                  <td className="py-3 px-4 text-stone-500 dark:text-slate-400">{s.category}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">+{s.inwardQty}</td>
                  <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">-{s.outwardQty}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 dark:text-white">{s.closingQty} {s.unit}</td>
                  <td className="py-3 px-4 text-right font-mono text-stone-700 dark:text-slate-300">₹{s.closingRate.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-orange-600 dark:text-purple-400">₹{s.closingValue.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="inventory"
        pageTitle="Inventory & Stock Summary"
        onImportSuccess={(newSnapId) => loadData(newSnapId)}
      />
    </div>
  );
}
