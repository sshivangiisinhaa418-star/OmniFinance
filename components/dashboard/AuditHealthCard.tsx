'use client';

import React, { useState } from 'react';
import { AuditHealthSummary, AuditIssue } from '@/lib/finance/auditScanner';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface AuditHealthCardProps {
  summary: AuditHealthSummary;
  onRefreshScan?: () => void;
}

export const AuditHealthCard: React.FC<AuditHealthCardProps> = ({ summary, onRefreshScan }) => {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(summary.issues.length > 0 ? summary.issues[0].id : null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'critical' | 'warning'>('all');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const getGradeBadgeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
      case 'B':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400';
      case 'C':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400';
      default:
        return 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400';
    }
  };

  const getScoreReasonTooltip = () => {
    if (summary.healthScore >= 95) {
      return '🟢 EXCELLENT SCORE (A+): Clean dataset! No critical GST missing entries or severe 60+ days overdue debt found.';
    }
    return `🔴 WHY SCORE IS ${summary.healthScore}/100: Score reduced due to ${summary.criticalCount} Critical Risk(s) (-12 pts each for missing GSTIN / >60 days overdue) and ${summary.warningCount} Warning(s) (-5 pts each for non-standard GST slabs / duplicate entries).`;
  };

  const filteredIssues = summary.issues.filter(issue => {
    if (filterCategory === 'critical') return issue.severity === 'critical';
    if (filterCategory === 'warning') return issue.severity === 'warning';
    return true;
  });

  const formatCurrency = (val: number) => {
    if (val <= 0) return '₹0';
    return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-5 animate-fade-in relative">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-amber-400 shrink-0 shadow-inner relative group cursor-help"
            title={getScoreReasonTooltip()}
          >
            {summary.healthScore >= 80 ? (
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-amber-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-stone-900 dark:text-white tracking-tight">
                AI Financial Audit &amp; Compliance Center
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Live Audit</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Automated CA-grade compliance, tax slab verification &amp; voucher integrity scanner
            </p>
          </div>
        </div>

        {/* Audit Score Badge with Reason Tooltip */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto relative group">
          <div
            className={`px-4 py-2 rounded-2xl border flex items-center gap-3 shadow-xs transition cursor-help ${getGradeBadgeColor(summary.scoreGrade)}`}
            onMouseEnter={() => setActiveTooltip('score')}
            onMouseLeave={() => setActiveTooltip(null)}
            title={getScoreReasonTooltip()}
          >
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-70 flex items-center justify-end gap-1">
                <span>Audit Health Index</span>
                <HelpCircle className="w-3 h-3" />
              </div>
              <div className="text-xl font-black leading-none">
                {summary.healthScore}<span className="text-xs font-bold text-stone-400">/100</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/60 dark:bg-stone-800/80 font-black text-sm flex items-center justify-center shadow-xs border border-stone-200/40 dark:border-stone-700/40">
              {summary.scoreGrade}
            </div>
          </div>

          {/* Floating Tooltip for Audit Score */}
          {activeTooltip === 'score' && (
            <div className="absolute right-0 top-full mt-2 z-50 w-72 p-3 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-medium rounded-2xl shadow-2xl space-y-1 animate-fade-in border border-stone-700">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-400 dark:text-amber-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Audit Score Explanation:</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {getScoreReasonTooltip()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Overview Stat Cards with Explanatory Hover Tooltips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterCategory('all')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer relative group ${
            filterCategory === 'all'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-sm'
              : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-400'
          }`}
          title="Displays total audit findings across Tax & GST, Duplicate Vouchers, and Credit Overdue Risks."
        >
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">Total Issues</div>
          <div className="text-lg font-black mt-0.5">{summary.totalIssuesCount}</div>
        </button>

        {/* Critical Risks Card (Red Warning Reason Tooltip) */}
        <button
          onClick={() => setFilterCategory('critical')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer relative group ${
            filterCategory === 'critical'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:border-rose-500/60'
          }`}
          onMouseEnter={() => setActiveTooltip('critical')}
          onMouseLeave={() => setActiveTooltip(null)}
          title={`🔴 CRITICAL RISK REASON: ${summary.criticalCount} severe issue(s) found (Invoices >₹50K missing GSTIN or Debtor balance >60 Days Overdue) which create tax penalties or bad debt write-offs.`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>Critical Risks</span>
            </span>
            <HelpCircle className="w-3 h-3 shrink-0 opacity-70" />
          </div>
          <div className="text-lg font-black mt-0.5">{summary.criticalCount}</div>

          {activeTooltip === 'critical' && (
            <div className="absolute left-0 top-full mt-2 z-50 w-72 p-3 bg-rose-950 text-rose-100 text-xs rounded-2xl shadow-2xl space-y-1 border border-rose-800 text-left animate-fade-in pointer-events-none">
              <div className="font-extrabold flex items-center gap-1.5 text-rose-300">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Why Critical Risks are Red:</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-95">
                Red flags represent severe financial or legal threats—such as high-value sales (&gt;₹50,000) missing GSTIN registration or customer balances overdue past 60 days. Immediate action is required to avoid ITC loss or bad debts.
              </p>
            </div>
          )}
        </button>

        {/* Warnings Card (Amber Warning Reason Tooltip) */}
        <button
          onClick={() => setFilterCategory('warning')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer relative group ${
            filterCategory === 'warning'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:border-amber-500/60'
          }`}
          onMouseEnter={() => setActiveTooltip('warning')}
          onMouseLeave={() => setActiveTooltip(null)}
          title={`🟡 WARNING REASON: ${summary.warningCount} warning(s) found (Non-standard GST tax slab ratio or generic customer names) requiring audit review before filing GST returns.`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>Warnings</span>
            </span>
            <HelpCircle className="w-3 h-3 shrink-0 opacity-70" />
          </div>
          <div className="text-lg font-black mt-0.5">{summary.warningCount}</div>

          {activeTooltip === 'warning' && (
            <div className="absolute left-0 top-full mt-2 z-50 w-72 p-3 bg-amber-950 text-amber-100 text-xs rounded-2xl shadow-2xl space-y-1 border border-amber-800 text-left animate-fade-in pointer-events-none">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Why Warnings are Amber:</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-95">
                Amber warnings indicate data quality issues or non-standard GST tax ratios (outside 5%, 12%, 18%, 28%) that require review before filing monthly tax returns.
              </p>
            </div>
          )}
        </button>

        {/* Total Impact Exposure Card */}
        <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800" title="Sum of monetary values associated with detected audit issues.">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Audit Exposure</div>
          <div className="text-lg font-black text-stone-900 dark:text-white mt-0.5 truncate">
            {formatCurrency(summary.totalImpactValue)}
          </div>
        </div>
      </div>

      {/* Issue Items Accordion */}
      {filteredIssues.length === 0 ? (
        <div className="p-6 text-center bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            No {filterCategory !== 'all' ? filterCategory : ''} audit risks detected!
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Your uploaded transaction datasets passed all GST tax slab, duplicate voucher, and credit exposure rules.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-extrabold text-stone-500 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>Detected Audit Findings ({filteredIssues.length})</span>
            <span className="text-[10px] font-normal text-stone-400">Hover over any red badge to see exact cause</span>
          </div>

          <div className="space-y-2">
            {filteredIssues.map(issue => {
              const isExpanded = expandedIssueId === issue.id;

              return (
                <div
                  key={issue.id}
                  className={`rounded-2xl border transition overflow-hidden ${
                    issue.severity === 'critical'
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : issue.severity === 'warning'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-blue-500/30 bg-blue-500/5'
                  }`}
                >
                  {/* Issue Header Button */}
                  <button
                    onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                    className="w-full p-3.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition group"
                    title={`WHY THIS IS ${issue.severity.toUpperCase()}: ${issue.description}. Recommended action: ${issue.recommendation}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0" title={issue.severity === 'critical' ? '🔴 CRITICAL RISK: Requires immediate resolution' : '🟡 WARNING: Review before filing GST'}>
                        {issue.severity === 'critical' ? (
                          <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" />
                        ) : issue.severity === 'warning' ? (
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Info className="w-5 h-5 text-blue-500" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-stone-900 dark:text-white">
                            {issue.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              issue.severity === 'critical'
                                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                : issue.severity === 'warning'
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                            }`}
                            title={`Severity Reason: ${issue.description}`}
                          >
                            {issue.severity}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[10px] font-bold">
                            {issue.category}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                          {issue.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {issue.totalImpactAmount > 0 && (
                        <span className="text-xs font-mono font-bold text-stone-900 dark:text-white bg-white/60 dark:bg-stone-800 px-2.5 py-1 rounded-xl border border-stone-200/50 dark:border-stone-700/50">
                          {formatCurrency(issue.totalImpactAmount)}
                        </span>
                      )}
                      <div className="p-1 rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-700/50 text-stone-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Audit Details & Recommended Action */}
                  {isExpanded && (
                    <div className="p-4 border-t border-stone-200/40 dark:border-stone-800/40 bg-white/60 dark:bg-stone-900/60 space-y-3">
                      {/* CA Recommendation */}
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <FileCheck2 className="w-4 h-4 text-amber-500" />
                          <span>Recommended Auditor Action:</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">{issue.recommendation}</p>
                      </div>

                      {/* Sample Affected Vouchers */}
                      {issue.sampleItems && issue.sampleItems.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Sample Affected Vouchers ({issue.affectedCount} Total)
                          </div>
                          <div className="space-y-1 text-xs">
                            {issue.sampleItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/60 dark:border-stone-700/60 flex items-center justify-between font-mono text-[11px]"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="font-bold text-stone-900 dark:text-white shrink-0">
                                    {item.voucherNo}
                                  </span>
                                  <span className="text-stone-400 shrink-0">•</span>
                                  <span className="text-stone-600 dark:text-stone-300 truncate">
                                    {item.partyName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  {item.note && (
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-sans">
                                      {item.note}
                                    </span>
                                  )}
                                  <span className="font-bold text-stone-900 dark:text-white">
                                    {formatCurrency(item.amount)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

