import { FinancialTransaction } from '@/types';

export interface AuditIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'Tax & GST' | 'Voucher Integrity' | 'Credit Risk' | 'Data Quality';
  title: string;
  description: string;
  affectedCount: number;
  totalImpactAmount: number;
  recommendation: string;
  sampleItems: {
    voucherNo: string;
    partyName: string;
    amount: number;
    date?: string;
    note?: string;
  }[];
}

export interface AuditHealthSummary {
  healthScore: number; // 0 - 100
  scoreGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  totalIssuesCount: number;
  totalImpactValue: number;
  issues: AuditIssue[];
}

export const runFinancialAuditScan = (
  transactionsByModule: {
    sales?: FinancialTransaction[];
    purchases?: FinancialTransaction[];
    receivables?: FinancialTransaction[];
    payables?: FinancialTransaction[];
    payments?: FinancialTransaction[];
    receipts?: FinancialTransaction[];
  }
): AuditHealthSummary => {
  const issues: AuditIssue[] = [];

  const sales = transactionsByModule.sales || [];
  const purchases = transactionsByModule.purchases || [];
  const receivables = transactionsByModule.receivables || [];
  const payables = transactionsByModule.payables || [];
  const payments = transactionsByModule.payments || [];
  const receipts = transactionsByModule.receipts || [];

  const allTxns = [...sales, ...purchases, ...receivables, ...payables, ...payments, ...receipts];

  // -------------------------------------------------------------
  // 1. Tax & GST Compliance Audit
  // -------------------------------------------------------------

  // Rule 1.1: High-value sales/purchases (> ₹50,000) with missing GSTIN
  const highValueMissingGstin = [...sales, ...purchases].filter(t => {
    const amt = t.grossTotal || t.totalAmount || t.amount || 0;
    const gstin = (t.gstin || '').trim();
    return amt >= 50000 && (!gstin || gstin.length < 10);
  });

  if (highValueMissingGstin.length > 0) {
    const totalImpact = highValueMissingGstin.reduce((sum, t) => sum + (t.grossTotal || t.totalAmount || t.amount || 0), 0);
    issues.push({
      id: 'tax_missing_gstin',
      severity: 'critical',
      category: 'Tax & GST',
      title: 'High-Value Invoices Missing GSTIN',
      description: `${highValueMissingGstin.length} transaction(s) over ₹50,000 do not have a registered GSTIN.`,
      affectedCount: highValueMissingGstin.length,
      totalImpactAmount: totalImpact,
      recommendation: 'Update customer/vendor profiles with valid 15-digit GSTINs to prevent GSTR-1 & Input Tax Credit (ITC) rejection penalties.',
      sampleItems: highValueMissingGstin.slice(0, 5).map(t => ({
        voucherNo: t.voucherNo || 'N/A',
        partyName: t.partyName || 'Cash Customer',
        amount: t.grossTotal || t.totalAmount || t.amount || 0,
        date: t.date,
        note: 'Missing 15-digit GSTIN number',
      })),
    });
  }

  // Rule 1.2: Tax Mismatch Audit (Calculated tax vs recorded tax)
  const taxMismatches = [...sales, ...purchases].filter(t => {
    const val = t.value || t.saleAmount || 0;
    const recTax = (t.cgst || 0) + (t.sgst || 0) + (t.igst || 0);
    if (val <= 0 || recTax <= 0) return false;
    const estTaxRate = (recTax / val) * 100;
    // Standard GST slabs in India are 5%, 12%, 18%, 28%
    const validSlabs = [5, 12, 18, 28];
    const isCloseToSlab = validSlabs.some(slab => Math.abs(estTaxRate - slab) < 1.5);
    return !isCloseToSlab;
  });

  if (taxMismatches.length > 0) {
    const totalImpact = taxMismatches.reduce((sum, t) => sum + ((t.cgst || 0) + (t.sgst || 0) + (t.igst || 0)), 0);
    issues.push({
      id: 'tax_mismatch_rate',
      severity: 'warning',
      category: 'Tax & GST',
      title: 'Non-Standard GST Tax Slab Variance',
      description: `${taxMismatches.length} invoice(s) have tax ratios that do not align with standard 5%, 12%, 18%, or 28% GST slabs.`,
      affectedCount: taxMismatches.length,
      totalImpactAmount: totalImpact,
      recommendation: 'Verify voucher tax split computations for item-level tax rate misconfigurations.',
      sampleItems: taxMismatches.slice(0, 5).map(t => ({
        voucherNo: t.voucherNo || 'N/A',
        partyName: t.partyName || 'Party',
        amount: t.grossTotal || t.totalAmount || t.amount || 0,
        date: t.date,
        note: `Tax amount: ₹${((t.cgst || 0) + (t.sgst || 0) + (t.igst || 0)).toLocaleString('en-IN')}`,
      })),
    });
  }

  // -------------------------------------------------------------
  // 2. Voucher Integrity & Duplicate Detector
  // -------------------------------------------------------------

  // Rule 2.1: Duplicate Voucher Numbers
  const voucherCountMap = new Map<string, FinancialTransaction[]>();
  allTxns.forEach(t => {
    if (!t.voucherNo || t.voucherNo.startsWith('VCH-') || t.voucherNo === 'N/A') return;
    const key = `${t.voucherType || ''}_${t.voucherNo.trim().toLowerCase()}`;
    const list = voucherCountMap.get(key) || [];
    list.push(t);
    voucherCountMap.set(key, list);
  });

  const duplicateGroups = Array.from(voucherCountMap.values()).filter(list => list.length > 1);
  if (duplicateGroups.length > 0) {
    const duplicateTxns = duplicateGroups.flat();
    const totalImpact = duplicateTxns.reduce((sum, t) => sum + (t.grossTotal || t.amount || 0), 0);
    issues.push({
      id: 'duplicate_vouchers',
      severity: 'critical',
      category: 'Voucher Integrity',
      title: 'Duplicate Voucher Numbers Detected',
      description: `Found ${duplicateGroups.length} voucher number(s) reused across multiple transaction entries.`,
      affectedCount: duplicateTxns.length,
      totalImpactAmount: totalImpact,
      recommendation: 'Audit duplicate vouchers to eliminate accidental double-entry postings or duplicate payments.',
      sampleItems: duplicateTxns.slice(0, 5).map(t => ({
        voucherNo: t.voucherNo,
        partyName: t.partyName || 'Unspecified',
        amount: t.grossTotal || t.amount || 0,
        date: t.date,
        note: 'Duplicate voucher reference',
      })),
    });
  }

  // Rule 2.2: Uncategorized or Missing Party Name
  const uncategorizedParty = allTxns.filter(t => {
    const p = (t.partyName || '').trim().toLowerCase();
    return !p || p === 'cash customer' || p === 'party' || p === 'unspecified' || p === 'cash payment';
  });

  if (uncategorizedParty.length > 10) {
    const totalImpact = uncategorizedParty.reduce((sum, t) => sum + (t.grossTotal || t.amount || 0), 0);
    issues.push({
      id: 'missing_party_names',
      severity: 'warning',
      category: 'Data Quality',
      title: 'High Frequency of Generic / Generic Party Names',
      description: `${uncategorizedParty.length} voucher(s) are logged under generic placeholders (e.g. "Cash Customer").`,
      affectedCount: uncategorizedParty.length,
      totalImpactAmount: totalImpact,
      recommendation: 'Tag specific party ledgers to enable accurate Customer/Vendor ledger reconciliations.',
      sampleItems: uncategorizedParty.slice(0, 5).map(t => ({
        voucherNo: t.voucherNo || 'N/A',
        partyName: t.partyName || 'Generic Party',
        amount: t.grossTotal || t.amount || 0,
        date: t.date,
        note: 'Generic party label',
      })),
    });
  }

  // -------------------------------------------------------------
  // 3. Credit Risk & Overdue Exposure
  // -------------------------------------------------------------

  // Rule 3.1: Severe Overdue Receivables (> 60 Days Overdue)
  const severeOverdueReceivables = receivables.filter(t => {
    return t.paymentStatus === 'unpaid' && (t.overdueDays || 0) > 60;
  });

  if (severeOverdueReceivables.length > 0) {
    const totalImpact = severeOverdueReceivables.reduce((sum, t) => sum + (t.closingBalance || t.amount || 0), 0);
    issues.push({
      id: 'credit_severe_overdue',
      severity: 'critical',
      category: 'Credit Risk',
      title: 'High-Risk Debtor Receivables (> 60 Days Overdue)',
      description: `${severeOverdueReceivables.length} customer account(s) have unpaid balances exceeding 60 days overdue.`,
      affectedCount: severeOverdueReceivables.length,
      totalImpactAmount: totalImpact,
      recommendation: 'Issue immediate payment reminders or place a temporary credit hold to prevent bad debt write-offs.',
      sampleItems: severeOverdueReceivables.slice(0, 5).map(t => ({
        voucherNo: t.voucherNo || 'N/A',
        partyName: t.partyName || 'Customer',
        amount: t.closingBalance || t.amount || 0,
        date: t.date,
        note: `Overdue by ${t.overdueDays || 60}+ days`,
      })),
    });
  }

  // Rule 3.2: Zero or Negative Voucher Amounts
  const zeroValueTxns = allTxns.filter(t => {
    const amt = t.grossTotal || t.amount || t.totalAmount || 0;
    return amt <= 0;
  });

  if (zeroValueTxns.length > 0) {
    issues.push({
      id: 'zero_value_vouchers',
      severity: 'info',
      category: 'Voucher Integrity',
      title: 'Zero-Value or Unpriced Voucher Logs',
      description: `${zeroValueTxns.length} transaction record(s) have zero or null monetary amounts.`,
      affectedCount: zeroValueTxns.length,
      totalImpactAmount: 0,
      recommendation: 'Review zero-value vouchers to confirm if they represent complimentary stock samples or incomplete data.',
      sampleItems: zeroValueTxns.slice(0, 5).map(t => ({
        voucherNo: t.voucherNo || 'N/A',
        partyName: t.partyName || 'Party',
        amount: 0,
        date: t.date,
        note: 'Zero value transaction',
      })),
    });
  }

  // -------------------------------------------------------------
  // Calculate Audit Health Score & Summary
  // -------------------------------------------------------------

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  let score = 100;
  score -= criticalCount * 12;
  score -= warningCount * 5;
  score -= infoCount * 2;
  if (score < 0) score = 0;

  let scoreGrade: AuditHealthSummary['scoreGrade'] = 'A+';
  if (score >= 95) scoreGrade = 'A+';
  else if (score >= 85) scoreGrade = 'A';
  else if (score >= 70) scoreGrade = 'B';
  else if (score >= 50) scoreGrade = 'C';
  else scoreGrade = 'D';

  const totalImpactValue = issues.reduce((sum, i) => sum + i.totalImpactAmount, 0);

  return {
    healthScore: score,
    scoreGrade,
    criticalCount,
    warningCount,
    infoCount,
    totalIssuesCount: issues.length,
    totalImpactValue,
    issues,
  };
};
