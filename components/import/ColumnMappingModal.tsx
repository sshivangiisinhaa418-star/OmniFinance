'use client';

import React, { useState } from 'react';
import { SheetMapping, DatasetType } from '@/types';
import { TARGET_FIELDS } from '@/lib/import/columnMapper';
import { X, CheckCircle, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

interface ColumnMappingModalProps {
  sheet: SheetMapping;
  fileName: string;
  onConfirmImport: (datasetType: DatasetType, updatedMappings: { excelHeader: string; targetField: string }[]) => void;
  onCancel: () => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  sheet,
  fileName,
  onConfirmImport,
  onCancel,
}) => {
  const [datasetType, setDatasetType] = useState<DatasetType>(sheet.datasetType);
  const [mappings, setMappings] = useState(
    sheet.columnMappings.map(m => ({
      excelHeader: m.excelHeader,
      targetField: m.targetField,
      confidence: m.confidence,
      sampleValue: m.sampleValue,
    }))
  );

  const handleTargetChange = (excelHeader: string, newTarget: string) => {
    setMappings(prev =>
      prev.map(m =>
        m.excelHeader === excelHeader ? { ...m, targetField: newTarget, confidence: 100 } : m
      )
    );
  };

  const isReady = mappings.some(m => m.targetField && m.targetField !== 'unmapped');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Review & Confirm Column Mapping</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              File: <span className="text-slate-200 font-mono">{fileName}</span> | Sheet:{' '}
              <span className="text-blue-400 font-semibold">{sheet.sheetName}</span> ({sheet.totalRows} records)
            </p>
          </div>

          <button onClick={onCancel} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Dataset Type Selector */}
          <div className="flex items-center justify-between bg-slate-950/60 p-4 border border-slate-800 rounded-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Detected Dataset Type
              </label>
              <select
                value={datasetType}
                onChange={e => setDatasetType(e.target.value as DatasetType)}
                className="bg-slate-900 border border-slate-700 text-sm font-semibold text-white rounded-lg px-3 py-1.5 focus:border-blue-500 focus:outline-none"
              >
                <option value="sales">Sales Dataset</option>
                <option value="purchases">Purchase Dataset</option>
                <option value="receivables">Receivables Aging</option>
                <option value="payables">Payables Aging</option>
                <option value="expenses">Expenses Dataset</option>
                <option value="inventory">Inventory Stock</option>
                <option value="tax">Tax / GST</option>
                <option value="ledger">Ledger / Trial Balance</option>
              </select>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Total Rows Detected</span>
              <p className="text-xl font-mono font-bold text-emerald-400">{sheet.totalRows.toLocaleString()}</p>
            </div>
          </div>

          {/* Mapping Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Source Excel Headers Mapping
            </h4>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Excel Header</th>
                    <th className="py-3 px-4">Sample Value</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Mapped Field</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {mappings.map(m => (
                    <tr key={m.excelHeader} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-200">{m.excelHeader}</td>
                      <td className="py-3 px-4 font-mono text-slate-400 truncate max-w-[180px]">
                        {String(m.sampleValue || '-')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.confidence >= 80
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : m.confidence >= 50
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {m.confidence}% Match
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={m.targetField}
                          onChange={e => handleTargetChange(m.excelHeader, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value="unmapped">-- Skip / Unmapped --</option>
                          {TARGET_FIELDS.map(f => (
                            <option key={f.key} value={f.key}>
                              {f.label} {f.required ? '*' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
          >
            Cancel
          </button>

          <button
            onClick={() => onConfirmImport(datasetType, mappings)}
            disabled={!isReady}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-600/25 transition"
          >
            <span>Import {sheet.totalRows} Records</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
