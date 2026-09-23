export type DatasetType =
  | 'sales'
  | 'purchases'
  | 'receivables'
  | 'payables'
  | 'payments'
  | 'receipts'
  | 'expenses'
  | 'inventory'
  | 'tax'
  | 'ledger'
  | 'general';

export interface FinancialSnapshot {
  id: string; // e.g. snap_payables_2026-09-30_173000
  module: DatasetType;
  fileName: string;
  fileSize?: number;
  uploadedAt: string; // ISO string
  uploadedBy: string;
  recordCount: number;
  status: 'active' | 'archived';
  grandTotalOpening?: number;
  grandTotalDebit?: number;
  grandTotalCredit?: number;
  grandTotalClosing?: number;
}

export interface SourceImport {
  id: string;
  filename: string;
  fileSize: number;
  datasetType: DatasetType;
  uploadedAt: string;
  uploadedBy: string;
  recordCount: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  status: 'pending' | 'mapped' | 'imported' | 'failed';
  organizationId: string;
}

export interface FinancialTransaction {
  id: string;
  snapshotId?: string;
  sourceImportId: string;
  datasetType?: DatasetType;
  date: string; // ISO date YYYY-MM-DD
  voucherNo: string;
  voucherType: string;
  voucherRefNo?: string;
  partyName: string;
  partyType: 'customer' | 'vendor' | 'other';
  gstin?: string;
  panNo?: string;
  ledgerName: string;
  ledgerCategory?: string;
  itemName?: string;
  itemCategory?: string;
  quantity?: number;
  rate?: number;
  value?: number;
  grossTotal?: number;
  saleAmount?: number;
  roundOff?: number;
  workContract?: number;
  transportationCharges?: number;
  openingBalance?: number;
  closingBalance?: number;
  debit: number;
  credit: number;
  amount: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  dueDate?: string;
  overdueDays?: number;
  paymentStatus?: 'paid' | 'unpaid' | 'partially_paid';
  description?: string;
  branch?: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
  totalSales: number;
  invoiceCount: number;
  receivableAmount: number;
  overdueAmount: number;
  lastTxnDate: string;
  avgInvoiceValue: number;
}

export interface VendorSummary {
  id: string;
  name: string;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
  totalPurchases: number;
  orderCount: number;
  payableAmount: number;
  overdueAmount: number;
  lastTxnDate: string;
  avgOrderValue: number;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  openingQty: number;
  openingValue: number;
  inwardQty: number;
  outwardQty: number;
  closingQty: number;
  closingRate: number;
  closingValue: number;
  reorderLevel?: number;
}

export interface TaxSummary {
  cgstPaid: number;
  sgstPaid: number;
  igstPaid: number;
  totalInputTax: number;
  cgstCollected: number;
  sgstCollected: number;
  igstCollected: number;
  totalOutputTax: number;
  netTaxPayable: number;
}

export interface AgingReport {
  current: number;      // 0-30 days
  days31_60: number;    // 31-60 days
  days61_90: number;    // 61-90 days
  days91_180: number;   // 91-180 days
  days180Plus: number;  // 180+ days
  total: number;
}

export interface GlobalFilterState {
  dateRange: { start: string; end: string };
  financialYear: string;
  quarter: string;
  month: string;
  party: string;
  ledger: string;
  voucherType: string;
  branch: string;
  searchQuery: string;
}

export interface ColumnMappingField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date';
}

export interface SheetMapping {
  sheetName: string;
  datasetType: DatasetType;
  totalRows: number;
  headers: string[];
  sampleRows: Record<string, any>[];
  rawRows: Record<string, any>[];
  columnMappings: {
    excelHeader: string;
    targetField: string;
    confidence: number;
    sampleValue: any;
  }[];
  validationErrors: { row: number; column: string; message: string }[];
  grandTotal?: Record<string, any> | null;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  dataset: string;
  details: string;
  status: 'success' | 'warning' | 'error';
}
