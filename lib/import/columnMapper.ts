import { DatasetType, ColumnMappingField } from '@/types';

// Target canonical fields for financial records
export const TARGET_FIELDS: ColumnMappingField[] = [
  { key: 'date', label: 'Date', required: true, type: 'date' },
  { key: 'particulars', label: 'Particulars', required: true, type: 'string' },
  { key: 'partyName', label: 'Party / Customer Name', required: true, type: 'string' },
  { key: 'voucherType', label: 'Voucher Type', required: false, type: 'string' },
  { key: 'voucherNo', label: 'Voucher No.', required: true, type: 'string' },
  { key: 'voucherRefNo', label: 'Voucher Ref. No.', required: false, type: 'string' },
  { key: 'gstin', label: 'GSTIN/UIN', required: false, type: 'string' },
  { key: 'panNo', label: 'PAN No.', required: false, type: 'string' },
  { key: 'quantity', label: 'Quantity', required: false, type: 'number' },
  { key: 'value', label: 'Value', required: false, type: 'number' },
  { key: 'grossTotal', label: 'Gross Total', required: false, type: 'number' },
  { key: 'saleAmount', label: 'Sale', required: false, type: 'number' },
  { key: 'igst', label: 'IGST', required: false, type: 'number' },
  { key: 'roundOff', label: 'Round Off', required: false, type: 'number' },
  { key: 'cgst', label: 'CGST', required: false, type: 'number' },
  { key: 'sgst', label: 'SGST', required: false, type: 'number' },
  { key: 'workContract', label: 'Work Contract', required: false, type: 'number' },
  { key: 'transportationCharges', label: 'Transportation Charges', required: false, type: 'number' },
  { key: 'ledgerName', label: 'Ledger Name', required: false, type: 'string' },
  { key: 'amount', label: 'Amount', required: false, type: 'number' },
  { key: 'debit', label: 'Debit', required: false, type: 'number' },
  { key: 'credit', label: 'Credit', required: false, type: 'number' },
  { key: 'openingBalance', label: 'Opening Balance', required: false, type: 'number' },
  { key: 'closingBalance', label: 'Closing Balance', required: false, type: 'number' },
];

// Dictionary of known aliases for TallyPrime exports
const ALIASES: Record<string, string[]> = {
  date: ['date', 'voucher date', 'txn date', 'transaction date', 'bill date'],
  partyName: ['particulars', 'party name', 'party', 'customer', 'vendor', 'customer name', 'buyer'],
  voucherType: ['voucher type', 'vch type', 'type'],
  voucherNo: ['voucher no', 'voucher no.', 'voucher number', 'vch no', 'invoice no'],
  voucherRefNo: ['voucher ref no', 'voucher ref. no.', 'vch ref no', 'ref no', 'voucher ref'],
  gstin: ['gstin/uin', 'gstin', 'uin', 'party gstin'],
  panNo: ['pan no', 'pan no.', 'pan', 'pan number'],
  quantity: ['quantity', 'qty', 'units'],
  value: ['value', 'taxable value', 'assessable value'],
  grossTotal: ['gross total', 'total amount', 'invoice value', 'bill amount'],
  saleAmount: ['sale', 'sales', 'sales amount', 'sale value'],
  igst: ['igst', 'integrated tax', 'igst amount'],
  roundOff: ['round off', 'roundoff', 'rounding'],
  cgst: ['cgst', 'central tax', 'cgst amount'],
  sgst: ['sgst', 'state tax', 'sgst amount', 'utgst'],
  workContract: ['work contract', 'works contract'],
  transportationCharges: ['transportation charges', 'freight', 'transport charges'],
  openingBalance: ['opening balance', 'opening bal', 'op bal', 'opening'],
  closingBalance: ['closing balance', 'closing bal', 'cl bal', 'closing'],
  debit: ['debit', 'dr'],
  credit: ['credit', 'cr'],
};

// Normalize strings for matching
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

const getSimilarity = (s1: string, s2: string): number => {
  const n1 = normalize(s1);
  const n2 = normalize(s2);
  if (n1 === n2) return 1.0;
  if (!n1 || !n2) return 0.0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.85;
  return 0.0;
};

export const autoMapColumn = (
  excelHeader: string,
  colIndex: number = -1,
  totalCols: number = 0
): { targetField: string; confidence: number } => {
  const trimHeader = excelHeader ? excelHeader.trim() : '';
  const normHeader = normalize(trimHeader);

  // Exact and keyword match checks for Tally Group Summary & Voucher Export headers
  if (normHeader === 'date' || normHeader === 'voucherdate' || normHeader === 'txndate' || normHeader === 'transactiondate' || normHeader === 'billdate') return { targetField: 'date', confidence: 100 };
  if (normHeader.includes('supplier') && (normHeader.includes('date') || normHeader.includes('inv'))) return { targetField: 'unmapped', confidence: 0 };

  if (normHeader === 'particulars' || normHeader === 'column1' || normHeader === 'column0') return { targetField: 'partyName', confidence: 100 };
  if (normHeader === 'vouchertype') return { targetField: 'voucherType', confidence: 100 };
  if (normHeader === 'voucherno' || normHeader === 'vouchernumber') return { targetField: 'voucherNo', confidence: 100 };
  if (normHeader === 'voucherrefno' || normHeader === 'vchrefno') return { targetField: 'voucherRefNo', confidence: 100 };
  if (normHeader === 'gstinuin' || normHeader === 'gstin') return { targetField: 'gstin', confidence: 100 };
  if (normHeader === 'panno' || normHeader === 'pan') return { targetField: 'panNo', confidence: 100 };
  if (normHeader === 'quantity' || normHeader === 'qty') return { targetField: 'quantity', confidence: 100 };
  if (normHeader === 'value') return { targetField: 'value', confidence: 100 };
  if (normHeader === 'grosstotal') return { targetField: 'grossTotal', confidence: 100 };
  if (normHeader === 'sale' || normHeader === 'sales') return { targetField: 'saleAmount', confidence: 100 };
  if (normHeader === 'igst') return { targetField: 'igst', confidence: 100 };
  if (normHeader === 'roundoff') return { targetField: 'roundOff', confidence: 100 };
  if (normHeader === 'cgst') return { targetField: 'cgst', confidence: 100 };
  if (normHeader === 'sgst') return { targetField: 'sgst', confidence: 100 };
  if (normHeader === 'workcontract') return { targetField: 'workContract', confidence: 100 };
  if (normHeader === 'transportationcharges') return { targetField: 'transportationCharges', confidence: 100 };
  // CRITICAL: Check debit/credit BEFORE opening/closing to handle "Opening Balance Debit" correctly
  if (normHeader.includes('debit') || normHeader === 'dr') return { targetField: 'debit', confidence: 100 };
  if (normHeader.includes('credit') || normHeader === 'cr') return { targetField: 'credit', confidence: 100 };
  if (normHeader.includes('opening') || normHeader === 'balance') return { targetField: 'openingBalance', confidence: 100 };
  if (normHeader.includes('closing')) return { targetField: 'closingBalance', confidence: 100 };

  // Positional fallback for blank headers
  if (!trimHeader || normHeader.startsWith('empty')) {
    if (colIndex === 0) return { targetField: 'date', confidence: 90 };
    if (colIndex === 1) return { targetField: 'partyName', confidence: 90 };
    if (colIndex === 2) return { targetField: 'voucherType', confidence: 90 };
    if (colIndex === 3) return { targetField: 'voucherNo', confidence: 90 };
    if (colIndex === 4) return { targetField: 'voucherRefNo', confidence: 90 };
    if (colIndex === 5) return { targetField: 'gstin', confidence: 90 };
    if (colIndex === 6) return { targetField: 'panNo', confidence: 90 };
    if (colIndex === 7) return { targetField: 'quantity', confidence: 90 };
    if (colIndex === 8) return { targetField: 'value', confidence: 90 };
    if (colIndex === 9) return { targetField: 'grossTotal', confidence: 90 };
    if (colIndex === 10) return { targetField: 'saleAmount', confidence: 90 };
    if (colIndex === 11) return { targetField: 'igst', confidence: 90 };
    if (colIndex === 12) return { targetField: 'roundOff', confidence: 90 };
    if (colIndex === 13) return { targetField: 'cgst', confidence: 90 };
    if (colIndex === 14) return { targetField: 'sgst', confidence: 90 };
    if (colIndex === 15) return { targetField: 'workContract', confidence: 90 };
    if (colIndex === 16) return { targetField: 'transportationCharges', confidence: 90 };
    return { targetField: 'unmapped', confidence: 0 };
  }

  let bestMatch = 'unmapped';
  let maxScore = 0;

  for (const [fieldKey, aliasList] of Object.entries(ALIASES)) {
    for (const alias of aliasList) {
      const score = getSimilarity(normHeader, alias);
      if (score > maxScore) {
        maxScore = score;
        bestMatch = fieldKey;
      }
    }
  }

  return {
    targetField: maxScore >= 0.7 ? bestMatch : 'unmapped',
    confidence: Math.round(maxScore * 100),
  };
};

export const classifyDatasetType = (headers: string[]): DatasetType => {
  const normHeaders = headers.map(h => normalize(h));
  const has = (keyword: string) => normHeaders.some(h => h.includes(keyword));

  if (has('sales') || has('sale') || has('workcontract') || (has('customer') && has('billedqty')) || (has('invoice') && has('party'))) {
    return 'sales';
  }
  if (has('purchase') || has('vendor') || has('supplier')) {
    return 'purchases';
  }
  if (has('receivable') || (has('pending') && has('customer')) || has('overduedays')) {
    return 'receivables';
  }
  if (has('payable') || (has('pending') && has('vendor')) || has('creditor') || has('creditors')) {
    return 'payables';
  }
  if (has('expense') || has('cost') || has('salary') || has('rent')) {
    return 'expenses';
  }
  if (has('stock') || has('closingqty') || has('inward') || has('outward')) {
    return 'inventory';
  }
  if (has('cgst') || has('sgst') || has('igst') || has('gstin')) {
    return 'tax';
  }

  return 'sales';
};
