'use client';

import React, { useState, useEffect } from 'react';
import { getStoredImports, getAuditLogs } from '@/lib/storage';
import { SourceImport, AuditLogItem } from '@/types';
import { History, FileSpreadsheet, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ImportHistoryPage() {
  const [imports, setImports] = useState<SourceImport[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    getStoredImports().then(setImports);
    setLogs(getAuditLogs());
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-blue-400" />
          <span>Excel Import Audit Trail & History</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Historical record of all Tally Excel imports, uploaded datasets, row counts, and system operations
        </p>
      </div>

      {/* Imports Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 glass-panel p-5">
        <h4 className="text-sm font-bold text-white mb-4">Completed Excel File Imports</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Dataset Type</th>
                <th className="py-3 px-4">Uploaded By</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4 text-right">Records</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {imports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No import history logged yet.
                  </td>
                </tr>
              ) : (
                imports.map(imp => (
                  <tr key={imp.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                      <span>{imp.filename}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {imp.datasetType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{imp.uploadedBy}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{new Date(imp.uploadedAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">{imp.recordCount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {imp.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 glass-panel p-5">
        <h4 className="text-sm font-bold text-white mb-4">System Operation Audit Log</h4>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No system operations logged yet.</p>
          ) : (
            logs.map(log => (
              <div key={log.id} className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="font-bold text-white">{log.action}</span>
                    <span className="text-slate-400 ml-2">({log.dataset})</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{log.details}</p>
                  </div>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-500">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
