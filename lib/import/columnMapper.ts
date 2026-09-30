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
  { key: 'unit', label: 'Unit (UOM)', required: false, type: 'string' },
  { key: 'rate', label: 'Rate / Price', required: false, type: 'number' },
  { key: 'itemName', label: 'Item / Product', required: false, type: 'string' },
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
  date: ['date', 'voucher date', 'txn date', 'transaction date', 'bill date', 'invoice date', 'vch date'],
  partyName: ['particulars', 'party name', 'party', 'customer', 'vendor', 'customer name', 'buyer', 'supplier', 'name of party'],
  voucherType: ['voucher type', 'vch type', 'type', 'vchtype', 'doc type'],
  voucherNo: ['voucher no', 'voucher no.', 'voucher number', 'vch no', 'invoice no', 'bill no', 'inv no', 'document no'],
  voucherRefNo: ['voucher ref no', 'voucher ref. no.', 'vch ref no', 'ref no', 'voucher ref', 'supplier invoice no'],
  gstin: ['gstin/uin', 'gstin', 'uin', 'party gstin', 'gst no'],
  panNo: ['pan no', 'pan no.', 'pan', 'pan number'],
  quantity: ['quantity', 'qty', 'billed qty', 'actual qty', 'units', 'billed quantity', 'actual quantity', 'total qty'],
  unit: ['unit', 'uom', 'base unit', 'units'],
  rate: ['rate', 'price', 'unit rate', 'rate/unit', 'rate (inr)', 'item rate'],
  itemName: ['item', 'item name', 'stock item', 'product', 'description of goods', 'commodity'],
  value: ['value', 'taxable value', 'assessable value', 'taxable amt', 'basic value'],
  grossTotal: ['gross total', 'total amount', 'invoice value', 'bill amount', 'net amount', 'total value'],
  saleAmount: ['sale', 'sales', 'sales amount', 'sale value', 'purchases ac', 'purchase amount'],
  igst: ['igst', 'integrated tax', 'igst amount', 'output igst', 'input igst'],
  roundOff: ['round off', 'roundoff', 'rounding', 'round-off'],
  cgst: ['cgst', 'central tax', 'cgst amount', 'output cgst', 'input cgst'],
  sgst: ['sgst', 'state tax', 'sgst amount', 'utgst', 'output sgst', 'input sgst'],
  workContract: ['work contract', 'works contract'],
  transportationCharges: ['transportation charges', 'freight', 'transport charges', 'freight charges'],
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

  // 1. Date variants
  if (
    normHeader.includes('date') ||
    normHeader === 'dt' ||
    normHeader === 'txndate' ||
    normHeader === 'billdate' ||
    normHeader === 'vchdate' ||
    normHeader === 'invoicedate'
  ) {
    if (!normHeader.includes('due') && !normHeader.includes('expiry') && !normHeader.includes('supplier')) {
      return { targetField: 'date', confidence: 100 };
    }
  }

  // 2. Party Name / Particulars
  if (
    normHeader === 'particulars' ||
    normHeader === 'column1' ||
    normHeader === 'column0' ||
    normHeader.includes('party') ||
    normHeader.includes('customer') ||
    normHeader.includes('vendor') ||
    normHeader.includes('buyer') ||
    normHeader.includes('supplier')
  ) {
    if (!normHeader.includes('gstin') && !normHeader.includes('pan') && !normHeader.includes('date')) {
      return { targetField: 'partyName', confidence: 100 };
    }
  }

  // 3. Voucher Type
  if (normHeader.includes('vouchertype') || normHeader === 'vchtype' || normHeader === 'type' || normHeader === 'doctype') {
    return { targetField: 'voucherType', confidence: 100 };
  }

  // 4. Voucher No.
  if (
    normHeader.includes('voucherno') ||
    normHeader.includes('vouchernumber') ||
    normHeader === 'vchno' ||
    normHeader.includes('invoiceno') ||
    normHeader === 'billno' ||
    (normHeader.includes('vch') && normHeader.includes('no')) ||
    (normHeader.includes('invoice') && normHeader.includes('no'))
  ) {
    if (!normHeader.includes('ref')) {
      return { targetField: 'voucherNo', confidence: 100 };
    }
  }

  // 5. Voucher Ref No.
  if (
    normHeader.includes('voucherrefno') ||
    normHeader === 'vchrefno' ||
    normHeader.includes('refno') ||
    normHeader.includes('reference') ||
    normHeader.includes('supplierinvoice')
  ) {
    return { targetField: 'voucherRefNo', confidence: 100 };
  }

  // 6. GSTIN & PAN
  if (normHeader.includes('gstin') || normHeader.includes('uin')) return { targetField: 'gstin', confidence: 100 };
  if (normHeader.includes('pan')) return { targetField: 'panNo', confidence: 100 };

  // 7. Quantity (Robust across Billed Qty, Actual Qty, Qty MT, Qty Nos, etc.)
  if (
    normHeader.includes('qty') ||
    normHeader.includes('quantity') ||
    normHeader.includes('units') ||
    normHeader.includes('billedqty') ||
    normHeader.includes('actualqty') ||
    normHeader === 'pcs' ||
    normHeader === 'nos' ||
    normHeader === 'bags' ||
    normHeader === 'kgs' ||
    normHeader === 'mtrs' ||
    normHeader === 'mts'
  ) {
    return { targetField: 'quantity', confidence: 100 };
  }

  // 8. Unit / UOM
  if (normHeader === 'unit' || normHeader === 'uom' || normHeader === 'baseunit' || normHeader === 'units') {
    return { targetField: 'unit', confidence: 100 };
  }

  // 9. Rate / Price
  if (normHeader.includes('rate') || normHeader.includes('price') || normHeader.includes('unitrate')) {
    return { targetField: 'rate', confidence: 100 };
  }

  // Helper for whole word boundary matching on header text
  const hasWord = (word: string) => {
    const clean = excelHeader.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    return new RegExp(`(^|\\s)${word}(\\s|$)`, 'i').test(clean);
  };

  // 10. Item / Product Name (Exclude store item expense heads)
  if (
    normHeader === 'item' ||
    normHeader === 'itemname' ||
    normHeader === 'stockitem' ||
    normHeader === 'product' ||
    normHeader === 'productname' ||
    normHeader === 'commodity' ||
    normHeader.includes('descriptionofgoods') ||
    normHeader.includes('itemdescription') ||
    (normHeader.includes('item') && !normHeader.startsWith('pur') && !normHeader.includes('store') && !normHeader.includes('consumable'))
  ) {
    return { targetField: 'itemName', confidence: 100 };
  }

  // 11. Financial Values & Totals (Taxable Base Value)
  if (
    normHeader === 'value' ||
    normHeader.includes('taxable') ||
    normHeader.includes('assessable') ||
    normHeader.includes('basicval') ||
    normHeader.includes('basicamt') ||
    normHeader.includes('basicamount') ||
    normHeader.includes('itemval') ||
    normHeader.includes('goodsval') ||
    normHeader.includes('netval') ||
    normHeader.includes('netamount') ||
    normHeader.includes('netamt')
  ) {
    return { targetField: 'value', confidence: 100 };
  }

  // Gross Total (Inclusive of all Taxes and Round Off)
  if (
    normHeader.includes('grosstotal') ||
    normHeader.includes('grossamount') ||
    normHeader.includes('totalamount') ||
    normHeader.includes('invoiceval') ||
    normHeader.includes('invoicevalue') ||
    normHeader.includes('invoicetotal') ||
    normHeader.includes('billamount') ||
    normHeader.includes('billval') ||
    normHeader.includes('billedamount') ||
    normHeader === 'total' ||
    normHeader.includes('grandtotal')
  ) {
    return { targetField: 'grossTotal', confidence: 100 };
  }

  if (normHeader.includes('sale') || normHeader.includes('sales') || normHeader.includes('purchase') || normHeader.includes('purchases')) {
    return { targetField: 'saleAmount', confidence: 100 };
  }

  // 12. Taxes - Disambiguated with word boundary so expenses like "Office Rent Ranchi (Gst)" or "Bank Charges (GST)" do not match
  if (hasWord('igst') || normHeader === 'igst' || normHeader.startsWith('inputigst') || normHeader.startsWith('outputigst')) {
    return { targetField: 'igst', confidence: 100 };
  }
  if (normHeader === 'roundoff' || normHeader === 'round' || hasWord('round') || hasWord('roundoff')) {
    return { targetField: 'roundOff', confidence: 100 };
  }
  if (hasWord('cgst') || normHeader === 'cgst' || normHeader.startsWith('inputcgst') || normHeader.startsWith('outputcgst')) {
    return { targetField: 'cgst', confidence: 100 };
  }
  if (hasWord('sgst') || normHeader === 'sgst' || normHeader.startsWith('inputsgst') || normHeader.startsWith('outputsgst') || hasWord('utgst') || normHeader === 'utgst') {
    return { targetField: 'sgst', confidence: 100 };
  }
  if (hasWord('workcontract') || hasWord('workscontract') || normHeader.includes('workcontract') || normHeader.includes('workscontract')) {
    return { targetField: 'workContract', confidence: 100 };
  }
  if (
    (hasWord('transport') || hasWord('transportation') || hasWord('freight')) &&
    !normHeader.startsWith('pur') // Exclude purchase heads like "Pur Transport Coal", "Pur Transport Dolomite"
  ) {
    return { targetField: 'transportationCharges', confidence: 100 };
  }

  // 13. Debit / Credit & Balances
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

  // Check specific register types first
  if (has('receipt') || has('receipts')) {
    return 'receipts';
  }
  if (has('payment') || has('payments')) {
    return 'payments';
  }
  if (has('sales') || has('sale') || has('workcontract') || (has('customer') && has('qty')) || (has('invoice') && has('party'))) {
    return 'sales';
  }
  if (has('purchase') || has('purchases') || has('supplierinvoice')) {
    return 'purchases';
  }
  if (has('receivable') || has('debtor') || has('debtors')) {
    return 'receivables';
  }
  if (has('payable') || has('creditor') || has('creditors')) {
    return 'payables';
  }
  if (has('expense') || has('cost') || has('salary') || has('rent')) {
    return 'expenses';
  }
  if (has('stock') || has('closingqty') || has('inward') || has('outward') || has('itemname')) {
    return 'inventory';
  }
  if (has('cgst') || has('sgst') || has('igst') || has('gstin')) {
    return 'tax';
  }

  return 'sales';
};
