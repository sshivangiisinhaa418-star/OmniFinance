import { FinancialTransaction, SourceImport, AuditLogItem, FinancialSnapshot, DatasetType } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase/client';
import { recordAuditLog } from './datasets/datasetService';

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
    const allSnaps: any[] = [];
    const BATCH_SIZE = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('snapshots')
        .select('*')
        .eq('module', module)
        .order('uploaded_at', { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        console.error(`Supabase error fetching snapshots for module ${module}:`, error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allSnaps.push(...data);
      if (data.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }
    }

    if (allSnaps.length === 0) return [];

    return allSnaps.map(d => ({
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
      storageBucket: d.storage_bucket,
      storagePath: d.storage_path,
      fileHash: d.file_hash,
      companyName: d.company_name || 'BKM Industries Limited',
      archivedAt: d.archived_at,
      archivedBy: d.archived_by,
    }));
  } catch (err) {
    console.error(`Exception fetching snapshots for ${module} from Supabase:`, err);
    return [];
  }
};

export const getLatestSnapshotForModule = async (module: DatasetType): Promise<FinancialSnapshot | null> => {
  const snapshots = await getSnapshotsForModule(module);
  const activeSnapshots = snapshots.filter(s => s.status === 'active');
  return activeSnapshots.length > 0 ? activeSnapshots[0] : null;
};

// Retrieve transactions for a list of snapshot IDs in a single query
export const getTransactionsForSnapshotIds = async (
  snapshotIds: string[],
  module: DatasetType = 'payables'
): Promise<FinancialTransaction[]> => {
  if (!snapshotIds || snapshotIds.length === 0) return [];
  const tableName = getTableNameForModule(module);

  if (!isSupabaseConfigured() || !supabase) {
    console.error('Supabase client is not configured.');
    return [];
  }

  try {
    const allData: any[] = [];
    const BATCH_SIZE = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .in('snapshot_id', snapshotIds)
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        console.error(`Supabase error fetching transactions from ${tableName} for snapshotIds:`, error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allData.push(...data);
      if (data.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }
    }

    if (allData.length === 0) return [];

    const validData = allData.filter(d => {
      const p = String(d.party_name || d.particulars || '').toLowerCase().trim();
      return !p.includes('grand total') && p !== 'total' && !p.startsWith('total ') && p !== 'total vouchers';
    });

    return validData.map(d => {
      const igst = Number(d.igst) || Number(d.input_igst_silvassa) || Number(d.input_igst_kol) || 0;
      const cgst = Number(d.cgst) || Number(d.input_cgst_silvassa) || Number(d.input_cgst_kol) || 0;
      const sgst = Number(d.sgst) || Number(d.input_sgst_silvassa) || Number(d.input_sgst_kol) || 0;
      const taxSum = igst + cgst + sgst;

      const roundOff = Number(d.round_off) || 0;
      const rawGross = Number(d.gross_total) || Number(d.total_amount) || Number(d.amount) || 0;
      const rawSale = d.sale_amount !== null && d.sale_amount !== undefined && !isNaN(Number(d.sale_amount))
        ? Number(d.sale_amount)
        : (d.purchases_ac !== null && d.purchases_ac !== undefined && !isNaN(Number(d.purchases_ac)) ? Number(d.purchases_ac) : undefined);
      const rawValue = d.value !== null && d.value !== undefined && !isNaN(Number(d.value)) ? Number(d.value) : undefined;

      // Mathematical precision resolution with round-off reconciliation
      const value = rawValue !== undefined ? rawValue : (rawSale !== undefined ? rawSale : (rawGross > taxSum ? rawGross - taxSum - roundOff : rawGross));
      const grossTotal = rawGross || (value ? value + taxSum + roundOff : 0);
      const saleAmount = rawSale !== undefined ? rawSale : (value || grossTotal);

      const rawData = d.raw_data || {};
      const unit = d.unit || rawData.unit || undefined;
      const unitName = d.unit_name || rawData.unitName || (unit === 'MT' ? 'Metric Ton' : unit === 'NOS' ? 'Numbers' : unit === 'KG' ? 'Kilograms' : undefined);
      const formattedQuantity = rawData.formattedQuantity || (unit ? `${(Number(d.quantity) || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${unit}` : undefined);
      const rate = Number(d.rate) || Number(rawData.rate) || 0;
      const itemName = d.item_name || rawData.itemName;

      return {
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
        itemName,
        itemCategory: d.item_category,
        quantity: Number(d.quantity) || 0,
        unit: unit || undefined,
        unitName: unitName || undefined,
        formattedQuantity,
        rate,
        value,
        grossTotal,
        saleAmount,
        roundOff: Number(d.round_off) || 0,
        cgst,
        sgst,
        igst,
        workContract: Number(d.work_contract) || 0,
        transportationCharges: Number(d.transportation_charges) || Number(d.transportation_expenses) || Number(d.transportation_expenses_rajmahal) || 0,
        openingBalance: Number(d.opening_balance) || 0,
        closingBalance: Number(d.closing_balance) || 0,
        debit: Number(d.debit) || 0,
        credit: Number(d.credit) || 0,
        amount: Number(d.amount) || saleAmount || grossTotal,
        taxAmount: Number(d.tax_amount) || taxSum,
        totalAmount: Number(d.total_amount) || grossTotal || saleAmount,
        dueDate: d.due_date,
        overdueDays: Number(d.overdue_days) || 0,
        paymentStatus: d.payment_status || 'paid',
        description: d.description,
      };
    });
  } catch (err) {
    console.error(`Failed to fetch transactions from Supabase table ${tableName}`, err);
    return [];
  }
};

export const getSnapshotTransactions = async (
  snapshotId: string,
  module: DatasetType = 'payables'
): Promise<FinancialTransaction[]> => {
  return getTransactionsForSnapshotIds([snapshotId], module);
};

// Retrieve transactions for ALL active snapshots of a module (or specific snapshotId if passed)
export const getActiveTransactionsForModule = async (
  module: DatasetType,
  specificSnapshotId?: string | null
): Promise<FinancialTransaction[]> => {
  if (specificSnapshotId && specificSnapshotId !== 'all') {
    return getSnapshotTransactions(specificSnapshotId, module);
  }

  const snapshots = await getSnapshotsForModule(module);
  const activeSnapshotIds = snapshots.filter(s => s.status === 'active').map(s => s.id);
  if (activeSnapshotIds.length === 0) return [];

  return getTransactionsForSnapshotIds(activeSnapshotIds, module);
};

export const saveSnapshotWithTransactions = async (
  snapshot: FinancialSnapshot,
  newTxns: FinancialTransaction[]
): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const tableName = getTableNameForModule(snapshot.module);

  const selectedCompany = typeof window !== 'undefined'
    ? (localStorage.getItem('omnifinance_selected_company') || 'BKM Industries Limited')
    : 'BKM Industries Limited';

  // 1. Upsert Snapshot Header in Supabase
  const { error: snapErr } = await supabase.from('snapshots').upsert({
    id: snapshot.id,
    module: snapshot.module,
    company_name: snapshot.companyName || selectedCompany,
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
    storage_bucket: snapshot.storageBucket || null,
    storage_path: snapshot.storagePath || null,
    file_hash: snapshot.fileHash || null,
  });

  if (snapErr) {
    console.error('Failed to save snapshot header to Supabase:', snapErr);
    throw snapErr;
  }

  // 2. Prepare transaction rows for dedicated Supabase table
  let rows: any[] = [];

  if (snapshot.module === 'sales') {
    rows = newTxns.map(t => {
      const taxSum = (t.igst || 0) + (t.cgst || 0) + (t.sgst || 0);
      const gross = (t.grossTotal !== undefined && t.grossTotal !== null ? t.grossTotal : null) ?? (t.totalAmount !== undefined && t.totalAmount !== null ? t.totalAmount : null) ?? t.amount ?? (t.value != null ? t.value + taxSum + (t.roundOff || 0) : 0);
      const sale = (t.saleAmount !== undefined && t.saleAmount !== null ? t.saleAmount : null) ?? (t.value !== undefined && t.value !== null ? t.value : null) ?? (gross > taxSum ? gross - taxSum - (t.roundOff || 0) : gross);
      const val = (t.value !== undefined && t.value !== null) ? t.value : (sale ?? gross);
      return {
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
        value: val,
        gross_total: gross,
        sale_amount: sale,
        igst: t.igst || 0,
        round_off: t.roundOff || 0,
        cgst: t.cgst || 0,
        sgst: t.sgst || 0,
        work_contract: t.workContract || 0,
        transportation_charges: t.transportationCharges || 0,
        raw_data: {
          unit: t.unit,
          unitName: t.unitName,
          formattedQuantity: t.formattedQuantity,
          rate: t.rate,
          itemName: t.itemName,
        },
      };
    });
  } else if (snapshot.module === 'receivables') {
    rows = newTxns.map(t => ({
      id: t.id,
      snapshot_id: snapshot.id,
      source_import_id: t.sourceImportId,
      transaction_date: t.date || new Date().toISOString().substring(0, 10),
      voucher_number: t.voucherNo || `VCH-${t.id}`,
      voucher_type: t.voucherType || 'Receipt',
      particulars: t.partyName || 'Customer',
      party_name: t.partyName || 'Customer',
      party_type: t.partyType || 'customer',
      ledger_name: t.ledgerName || 'Receivables Account',
      ledger_category: 'receivables',
      opening_balance: t.openingBalance || 0,
      closing_balance: t.closingBalance || 0,
      debit: t.debit || 0,
      credit: t.credit || 0,
      amount: t.amount || 0,
      due_date: t.dueDate || null,
      overdue_days: t.overdueDays || 0,
      payment_status: t.paymentStatus || 'unpaid',
      description: t.description || '',
      raw_data: {
        unit: t.unit,
        unitName: t.unitName,
        formattedQuantity: t.formattedQuantity,
        rate: t.rate,
        itemName: t.itemName,
      },
    }));
  } else if (snapshot.module === 'payables') {
    rows = newTxns.map(t => ({
      id: t.id,
      snapshot_id: snapshot.id,
      source_import_id: t.sourceImportId,
      transaction_date: t.date || new Date().toISOString().substring(0, 10),
      voucher_number: t.voucherNo || `VCH-${t.id}`,
      voucher_type: t.voucherType || 'Payment',
      particulars: t.partyName || 'Vendor',
      party_name: t.partyName || 'Vendor',
      party_type: t.partyType || 'vendor',
      ledger_name: t.ledgerName || 'Payables Account',
      ledger_category: 'payables',
      opening_balance: t.openingBalance || 0,
      closing_balance: t.closingBalance || 0,
      debit: t.debit || 0,
      credit: t.credit || 0,
      amount: t.amount || 0,
      payment_status: t.paymentStatus || 'unpaid',
      description: t.description || '',
      raw_data: {
        unit: t.unit,
        unitName: t.unitName,
        formattedQuantity: t.formattedQuantity,
        rate: t.rate,
        itemName: t.itemName,
      },
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
    rows = newTxns.map(t => {
      const taxSum = (t.igst || 0) + (t.cgst || 0) + (t.sgst || 0);
      const gross = (t.grossTotal !== undefined && t.grossTotal !== null ? t.grossTotal : null) ?? (t.totalAmount !== undefined && t.totalAmount !== null ? t.totalAmount : null) ?? t.amount ?? (t.value != null ? t.value + taxSum + (t.roundOff || 0) : 0);
      const sale = (t.saleAmount !== undefined && t.saleAmount !== null ? t.saleAmount : null) ?? (t.value !== undefined && t.value !== null ? t.value : null) ?? (gross > taxSum ? gross - taxSum - (t.roundOff || 0) : gross);
      const val = (t.value !== undefined && t.value !== null) ? t.value : (sale ?? gross);
      return {
        id: t.id,
        snapshot_id: snapshot.id,
        source_import_id: t.sourceImportId,
        transaction_date: t.date || new Date().toISOString().substring(0, 10),
        particulars: t.partyName || 'Vendor',
        party_name: t.partyName || 'Vendor',
        voucher_number: t.voucherNo || `VCH-${t.id}`,
        voucher_type: t.voucherType || 'Purchase',
        ledger_name: t.ledgerName || 'Purchase Account',
        item_name: t.itemName || '',
        item_category: t.itemCategory || '',
        gstin: t.gstin || '',
        pan_no: t.panNo || '',
        quantity: t.quantity || 0,
        rate: t.rate || 0,
        value: val,
        gross_total: gross,
        purchases_ac: sale,
        amount: gross || val,
        tax_amount: t.taxAmount || taxSum,
        total_amount: gross || val,
        round_off: t.roundOff || 0,
        igst: t.igst || 0,
        cgst: t.cgst || 0,
        sgst: t.sgst || 0,
        input_igst_silvassa: t.igst || 0,
        input_cgst_silvassa: t.cgst || 0,
        input_sgst_silvassa: t.sgst || 0,
        transportation_expenses: t.transportationCharges || 0,
        description: t.description || '',
        raw_data: {
          unit: t.unit,
          unitName: t.unitName,
          formattedQuantity: t.formattedQuantity,
          rate: t.rate,
          itemName: t.itemName,
        },
      };
    });
  } else {
    rows = newTxns.map(t => ({
      id: t.id,
      snapshot_id: snapshot.id,
      source_import_id: t.sourceImportId,
      transaction_date: t.date || new Date().toISOString().substring(0, 10),
      particulars: t.partyName || 'Entity',
      voucher_number: t.voucherNo || `VCH-${t.id}`,
      voucher_type: t.voucherType || 'Journal',
      party_name: t.partyName || 'Entity',
      party_type: t.partyType || 'other',
      ledger_name: t.ledgerName || 'General Account',
      ledger_category: snapshot.module,
      opening_balance: t.openingBalance || 0,
      closing_balance: t.closingBalance || 0,
      debit: t.debit || 0,
      credit: t.credit || 0,
      amount: t.amount || 0,
      payment_status: t.paymentStatus || 'unpaid',
      description: t.description || '',
      raw_data: {
        unit: t.unit,
        unitName: t.unitName,
        formattedQuantity: t.formattedQuantity,
        rate: t.rate,
        itemName: t.itemName,
      },
    }));
  }

  // 3. Insert transaction records directly into Supabase table in fast batches of 250
  const CHUNK_SIZE = 250;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    let { error: insertErr } = await supabase.from(tableName).insert(chunk);

    // Resilient fallback: if the target table doesn't have the 'raw_data' column in Supabase, strip it and retry
    if (insertErr && (insertErr.message?.includes('raw_data') || insertErr.details?.includes('raw_data') || insertErr.hint?.includes('raw_data'))) {
      console.warn(`Table "${tableName}" schema has no "raw_data" column. Retrying insert cleanly without raw_data...`);
      const cleanChunk = chunk.map(({ raw_data, ...rest }: any) => rest);
      const retryRes = await supabase.from(tableName).insert(cleanChunk);
      insertErr = retryRes.error;
    }

    if (insertErr) {
      console.error(`Failed to insert batch [${i}..${i + CHUNK_SIZE}] into Supabase table ${tableName}:`, insertErr);
      // Clean up orphaned snapshot header if transaction insert failed
      try {
        await supabase.from('snapshots').delete().eq('id', snapshot.id);
      } catch {}
      throw insertErr;
    }
  }

  // 4. Log audit event for dataset upload
  await recordAuditLog({
    action: 'UPLOAD_DATASET',
    datasetId: snapshot.id,
    fileName: snapshot.fileName,
    module: snapshot.module,
    details: `Imported dataset "${snapshot.fileName}" with ${snapshot.recordCount} rows into module "${snapshot.module}".`,
    userEmail: snapshot.uploadedBy,
    metadata: {
      recordCount: snapshot.recordCount,
      grandTotalClosing: snapshot.grandTotalClosing,
      storagePath: snapshot.storagePath,
      fileHash: snapshot.fileHash,
    },
  });
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
    return getActiveTransactionsForModule(datasetFilter as DatasetType);
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

