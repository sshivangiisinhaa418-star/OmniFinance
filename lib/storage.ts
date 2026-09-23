import { FinancialTransaction, SourceImport, AuditLogItem, FinancialSnapshot, DatasetType } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase/client';

// Map each financial module to its own dedicated Supabase table
const getTableNameForModule = (module: DatasetType): string => {
  switch (module) {
    case 'payables':
      return 'payables_transactions';
    case 'receivables':
      return 'receivables_transactions';
    case 'sales':
      return 'sales_transactions';
    case 'purchases':
      return 'purchases_transactions';
    case 'payments':
      return 'payments_transactions';
    case 'receipts':
      return 'receipts_transactions';
    case 'inventory':
      return 'inventory_stock';
    case 'tax':
      return 'tax_gst_transactions';
    case 'expenses':
      return 'expenses_transactions';
    default:
      return 'payables_transactions';
  }
};

// ==========================================
// DEDICATED SUPABASE DATABASE SNAPSHOT ENGINE
// ==========================================

export const getSnapshotsForModule = async (module: DatasetType): Promise<FinancialSnapshot[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    console.error('Supabase client is not configured.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('snapshots')
      .select('*')
      .eq('module', module)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error(`Supabase error fetching snapshots for module ${module}:`, error);
      return [];
    }

    if (!data) return [];

    return data.map(d => ({
      id: d.id,
      module: d.module as DatasetType,
      fileName: d.file_name,
      fileSize: d.file_size,
      uploadedAt: d.uploaded_at,
      uploadedBy: d.uploaded_by,
      recordCount: d.record_count,
      status: d.status as any,
      grandTotalOpening: Number(d.grand_total_opening) || 0,
      grandTotalDebit: Number(d.grand_total_debit) || 0,
      grandTotalCredit: Number(d.grand_total_credit) || 0,
      grandTotalClosing: Number(d.grand_total_closing) || 0,
    }));
  } catch (err) {
    console.error(`Exception fetching snapshots for ${module} from Supabase:`, err);
    return [];
  }
};

export const getLatestSnapshotForModule = async (module: DatasetType): Promise<FinancialSnapshot | null> => {
  const snapshots = await getSnapshotsForModule(module);
  return snapshots.length > 0 ? snapshots[0] : null;
};

export const getSnapshotTransactions = async (
  snapshotId: string,
  module: DatasetType = 'payables'
): Promise<FinancialTransaction[]> => {
  const tableName = getTableNameForModule(module);

  if (!isSupabaseConfigured() || !supabase) {
    console.error('Supabase client is not configured.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('snapshot_id', snapshotId);

    if (error) {
      console.error(`Supabase error fetching transactions from ${tableName} for snapshot ${snapshotId}:`, error);
      return [];
    }

    if (!data) return [];

    return data.map(d => ({
      id: d.id,
      snapshotId: d.snapshot_id,
      sourceImportId: d.source_import_id,
      datasetType: module,
      date: d.transaction_date,
      voucherNo: d.voucher_number || `VCH-${d.id}`,
      voucherType: d.voucher_type || (module === 'sales' ? 'Sales' : module === 'purchases' ? 'Purchase' : 'Journal'),
      voucherRefNo: d.voucher_ref_no || '',
      partyName: d.party_name || d.particulars || 'Cash Customer',
      partyType: d.party_type || (module === 'receivables' || module === 'sales' ? 'customer' : 'vendor'),
      gstin: d.gstin || '',
      panNo: d.pan_no || '',
      ledgerName: d.ledger_name || (module === 'sales' ? 'Sales Account' : 'General Ledger'),
      ledgerCategory: module,
      itemName: d.item_name,
      itemCategory: d.item_category,
      quantity: Number(d.quantity) || 0,
      rate: Number(d.rate) || 0,
      // value: the base taxable value (before GST)
      value: Number(d.value) || 0,
      // grossTotal: the total invoice value including all taxes
      grossTotal: Number(d.gross_total) || 0,
      // saleAmount: the "Sale" or "Purchases A/c" ledger amount
      saleAmount: module === 'purchases'
        ? (Number(d.purchases_ac) || Number(d.sale_amount) || 0)
        : (Number(d.sale_amount) || 0),
      roundOff: Number(d.round_off) || 0,
      cgst: Number(d.cgst) || Number(d.input_cgst_silvassa) || Number(d.input_cgst_kol) || 0,
      sgst: Number(d.sgst) || Number(d.input_sgst_silvassa) || Number(d.input_sgst_kol) || 0,
      igst: Number(d.igst) || Number(d.input_igst_silvassa) || Number(d.input_igst_kol) || 0,
      workContract: Number(d.work_contract) || 0,
      transportationCharges: Number(d.transportation_charges) || Number(d.transportation_expenses) || Number(d.transportation_expenses_rajmahal) || 0,
      openingBalance: Number(d.opening_balance) || 0,
      closingBalance: Number(d.closing_balance) || 0,
      debit: Number(d.debit) || 0,
      credit: Number(d.credit) || 0,
      amount: Number(d.amount) || 0,
      taxAmount: Number(d.tax_amount) || (Number(d.igst || 0) + Number(d.cgst || 0) + Number(d.sgst || 0)),
      totalAmount: Number(d.total_amount) || Number(d.gross_total) || 0,
      dueDate: d.due_date,
      overdueDays: Number(d.overdue_days) || 0,
      paymentStatus: d.payment_status || 'paid',
      description: d.description,
    }));
  } catch (err) {
    console.error(`Failed to fetch transactions from Supabase table ${tableName}`, err);
    return [];
  }
};

export const saveSnapshotWithTransactions = async (
  snapshot: FinancialSnapshot,
  newTxns: FinancialTransaction[]
): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const tableName = getTableNameForModule(snapshot.module);

  // OPTION A: Cleanly replace/purge existing snapshots & transactions for this module
  try {
    // Delete existing transactions for this module
    await supabase.from(tableName).delete().neq('id', '0');
    // Delete existing snapshot headers for this module
    await supabase.from('snapshots').delete().eq('module', snapshot.module);
  } catch (cleanErr) {
    console.warn(`Snapshot purge notice for module ${snapshot.module}:`, cleanErr);
  }

  // 1. Upsert Snapshot Header in Supabase
  const { error: snapErr } = await supabase.from('snapshots').upsert({
    id: snapshot.id,
    module: snapshot.module,
    file_name: snapshot.fileName,
    file_size: snapshot.fileSize || 0,
    uploaded_at: snapshot.uploadedAt,
    uploaded_by: snapshot.uploadedBy,
    record_count: snapshot.recordCount,
    grand_total_opening: snapshot.grandTotalOpening || 0,
    grand_total_debit: snapshot.grandTotalDebit || 0,
    grand_total_credit: snapshot.grandTotalCredit || 0,
    grand_total_closing: snapshot.grandTotalClosing || 0,
    status: snapshot.status || 'active',
  });

  if (snapErr) {
    console.error('Failed to save snapshot header to Supabase:', snapErr);
    throw snapErr;
  }

  // 2. Prepare transaction rows for dedicated Supabase table
  let rows: any[] = [];

  if (snapshot.module === 'sales') {
    rows = newTxns.map(t => ({
      id: t.id,
      snapshot_id: snapshot.id,
      source_import_id: t.sourceImportId,
      transaction_date: t.date || new Date().toISOString().substring(0, 10),
      particulars: t.partyName || 'Cash Customer',
      party_name: t.partyName || 'Cash Customer',
      voucher_type: t.voucherType || 'Sales',
      voucher_number: t.voucherNo || `VCH-${t.id}`,
      voucher_ref_no: t.voucherRefNo || '',
      gstin: t.gstin || '',
      pan_no: t.panNo || '',
      quantity: t.quantity || 0,
      value: t.value || 0,
      gross_total: t.grossTotal || 0,
      sale_amount: t.saleAmount || 0,
      igst: t.igst || 0,
      round_off: t.roundOff || 0,
      cgst: t.cgst || 0,
      sgst: t.sgst || 0,
      work_contract: t.workContract || 0,
      transportation_charges: t.transportationCharges || 0,
    }));
  } else if (snapshot.module === 'receivables') {
    rows = newTxns.map(t => ({
      id: t.id,
      snapshot_id: snapshot.id,
      source_import_id: t.sourceImportId,
      transaction_date: t.date || new Date().toISOString().substring(0, 10),
      voucher_number: t.voucherNo || `VCH-${t.id}`,
      voucher_type: t.voucherType || 'Receipt',
      party_name: t.partyName,
      party_type: t.partyType || 'customer',
      ledger_name: t.ledgerName || 'Receivables Account',
      ledger_category: 'receivables',
      opening_balance: t.openingBalance || 0,
      closing_balance: t.closingBalance || 0,
      debit: t.debit || 0,
      credit: t.credit || 0,
      amount: t.amount || 0,
      due_date: t.dueDate,
      overdue_days: t.overdueDays || 0,
      payment_status: t.paymentStatus || 'unpaid',
      description: t.description,
    }));
  } else if (snapshot.module === 'payables') {
    rows = newTxns.map(t => ({
      id: t.id,
      snapshot_id: snapshot.id,
      source_import_id: t.sourceImportId,
      transaction_date: t.date,
      voucher_number: t.voucherNo,
      voucher_type: t.voucherType || 'Payment',
      party_name: t.partyName,
      party_type: t.partyType || 'vendor',
      ledger_name: t.ledgerName || 'Payables Account',
      ledger_category: 'payables',
      opening_balance: t.openingBalance || 0,
      closing_balance: t.closingBalance || 0,
      debit: t.debit || 0,
      credit: t.credit || 0,
      amount: t.amount || 0,
      payment_status: t.paymentStatus || 'unpaid',
      description: t.description,
    }));
  } else if (snapshot.module === 'payments') {
    rows = newTxns.map(t => ({
      id: t.id,
      snapshot_id: snapshot.id,
      source_import_id: t.sourceImportId,
      transaction_date: t.date || new Date().toISOString().substring(0, 10),
      particulars: t.partyName || 'Cash Payment',
      party_name: t.partyName || 'Cash Payment',
      voucher_type: t.voucherType || 'Payment',
      voucher_number: t.voucherNo || `VCH-${t.id}`,
      debit: t.debit || t.amount || 0,
      credit: t.credit || 0,
      amount: t.amount || t.debit || 0,
    }));
  } else if (snapshot.module === 'receipts') {
    rows = newTxns.map(t => ({
      id: t.id,
      snapshot_id: snapshot.id,
      source_import_id: t.sourceImportId,
      transaction_date: t.date || new Date().toISOString().substring(0, 10),
      particulars: t.partyName || 'Cash Receipt',
      party_name: t.partyName || 'Cash Receipt',
      voucher_type: t.voucherType || 'Receipt',
      voucher_number: t.voucherNo || `VCH-${t.id}`,
      debit: t.debit || 0,
      credit: t.credit || t.amount || 0,
      amount: t.amount || t.credit || 0,
    }));
  } else if (snapshot.module === 'purchases') {
    rows = newTxns.map(t => ({
      id: t.id,
      snapshot_id: snapshot.id,
      source_import_id: t.sourceImportId,
      transaction_date: t.date || new Date().toISOString().substring(0, 10),
      particulars: t.partyName || 'Vendor',
      party_name: t.partyName || 'Vendor',
      voucher_number: t.voucherNo || `VCH-${t.id}`,
      voucher_type: t.voucherType || 'Purchase',
      ledger_name: t.ledgerName || 'Purchase Account',
      item_name: t.itemName,
      item_category: t.itemCategory,
      gstin: t.gstin || '',
      pan_no: t.panNo || '',
      quantity: t.quantity || 0,
      rate: t.rate || 0,
      value: t.value || t.saleAmount || 0,
      gross_total: t.grossTotal || 0,
      purchases_ac: t.saleAmount || 0,
      amount: t.amount || t.grossTotal || 0,
      tax_amount: t.taxAmount || ((t.igst || 0) + (t.cgst || 0) + (t.sgst || 0)),
      total_amount: t.totalAmount || t.grossTotal || 0,
      round_off: t.roundOff || 0,
      input_igst_silvassa: t.igst || 0,
      input_cgst_silvassa: t.cgst || 0,
      input_sgst_silvassa: t.sgst || 0,
      transportation_expenses: t.transportationCharges || 0,
      description: t.description,
    }));
  } else {
    rows = newTxns.map(t => ({
      id: t.id,
      snapshot_id: snapshot.id,
      source_import_id: t.sourceImportId,
      transaction_date: t.date,
      voucher_number: t.voucherNo,
      voucher_type: t.voucherType,
      party_name: t.partyName,
      party_type: t.partyType,
      ledger_name: t.ledgerName,
      ledger_category: snapshot.module,
      opening_balance: t.openingBalance || 0,
      closing_balance: t.closingBalance || 0,
      debit: t.debit || 0,
      credit: t.credit || 0,
      amount: t.amount || 0,
      payment_status: t.paymentStatus || 'unpaid',
      description: t.description,
    }));
  }

  // 3. Insert transaction records directly into Supabase table in fast batches of 100
  const CHUNK_SIZE = 100;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error: insertErr } = await supabase.from(tableName).insert(chunk);
    if (insertErr) {
      console.error(`Failed to insert batch [${i}..${i + CHUNK_SIZE}] into Supabase table ${tableName}:`, insertErr);
      throw insertErr;
    }
  }
};

// ==========================================
// DATA CLEANUP / TRUNCATE HELPERS
// ==========================================

export const clearModuleData = async (module: DatasetType): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) return;
  const tableName = getTableNameForModule(module);
  try {
    await supabase.from(tableName).delete().neq('id', '0');
    await supabase.from('snapshots').delete().eq('module', module);
  } catch (err) {
    console.error(`Failed to truncate Supabase table ${tableName}`, err);
  }
};

export const clearAllData = async (): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const modules: DatasetType[] = ['payables', 'receivables', 'sales', 'purchases', 'payments', 'receipts', 'inventory', 'tax', 'expenses'];
    for (const m of modules) {
      await supabase.from(getTableNameForModule(m)).delete().not('id', 'is', null);
    }
    await supabase.from('snapshots').delete().not('id', 'is', null);
  } catch (err) {
    console.error('Failed to clear Supabase tables', err);
  }
};

// Backward compatibility helpers
export const getStoredTransactions = async (datasetFilter?: string): Promise<FinancialTransaction[]> => {
  if (datasetFilter) {
    const latest = await getLatestSnapshotForModule(datasetFilter as DatasetType);
    if (latest) {
      return getSnapshotTransactions(latest.id, datasetFilter as DatasetType);
    }
  }
  return [];
};

export const saveTransactions = async (
  newTxns: FinancialTransaction[],
  targetDataset?: string
): Promise<void> => {
  const module = (targetDataset || 'general') as DatasetType;
  const snapshotId = `snap_${module}_${new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14)}`;

  const snapshot: FinancialSnapshot = {
    id: snapshotId,
    module,
    fileName: `Upload_${new Date().toISOString().substring(0, 10)}.xlsx`,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Finance User',
    recordCount: newTxns.length,
    status: 'active',
  };

  await saveSnapshotWithTransactions(snapshot, newTxns);
};

export const getStoredImports = async (): Promise<SourceImport[]> => {
  return [];
};

export const saveImportMetadata = async (imp: SourceImport): Promise<void> => {
  // No-op
};

export const getAuditLogs = (): AuditLogItem[] => {
  return [];
};

export const addAuditLog = (log: Omit<AuditLogItem, 'id' | 'timestamp'>): void => {
  // No-op
};

