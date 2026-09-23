import * as XLSX from 'xlsx';
import { SheetMapping, DatasetType, FinancialTransaction } from '@/types';
import { classifyDatasetType, autoMapColumn } from './columnMapper';
import { parseAmount, parseBalanceAmount, parseDate, validateFinancialRecord } from './validator';

export interface ParsedWorkbookResult {
  fileName: string;
  fileSize: number;
  sheets: SheetMapping[];
}

export const findHeaderRowIndex = (rows2D: any[][]): number => {
  if (!rows2D || rows2D.length === 0) return 0;

  const headerKeywords = [
    'date', 'voucher', 'vch', 'particulars', 'party', 'name', 'ledger', 'item',
    'amount', 'total', 'debit', 'credit', 'dr', 'cr', 'qty', 'quantity', 'rate',
    'tax', 'cgst', 'sgst', 'igst', 'gst', 'balance', 'closing', 'opening',
    'bill', 'ref', 'narration', 'customer', 'vendor', 'sl', 'no', 'serial', 'type', 'due'
  ];

  let bestIndex = 0;
  let maxScore = -1;

  for (let i = 0; i < Math.min(rows2D.length, 15); i++) {
    const row = rows2D[i];
    if (!Array.isArray(row)) continue;

    const nonCount = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '').length;
    if (nonCount < 2) continue;

    let score = 0;
    row.forEach(cell => {
      const str = String(cell).toLowerCase().trim();
      if (headerKeywords.some(kw => str.includes(kw))) {
        score += 3;
      }
      if (str.length > 0 && str.length < 30) {
        score += 1;
      }
    });

    if (score > maxScore) {
      maxScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
};

/**
 * Detect Tally's multi-level header structure (2-3 rows) and merge them into clean column names.
 * Tally Group Summary headers look like:
 *   Row N:   [Particulars] [         ] [Transactions] [        ] [         ]
 *   Row N+1: [           ] [Opening  ] [            ] [        ] [Closing  ]
 *   Row N+2: [           ] [Balance  ] [Debit       ] [Credit  ] [Balance  ]
 */
const findAndMergeHeaders = (rows2D: any[][]): { headers: string[]; dataStartIndex: number } => {
  if (!rows2D || rows2D.length === 0) return { headers: [], dataStartIndex: 0 };

  // Step 1: Find key header rows
  let particularsRow = -1;
  let openingRow = -1;
  let debitCreditRow = -1;

  for (let i = 0; i < Math.min(rows2D.length, 20); i++) {
    const row = rows2D[i];
    if (!Array.isArray(row)) continue;
    const rowStr = row.map(c => String(c ?? '').toLowerCase().trim()).join(' ');

    if (particularsRow === -1 && rowStr.includes('particulars')) {
      particularsRow = i;
    }
    if (openingRow === -1 && rowStr.includes('opening')) {
      openingRow = i;
    }
    if (debitCreditRow === -1 && rowStr.includes('debit') && rowStr.includes('credit')) {
      debitCreditRow = i;
    }
  }

  // If we found the multi-level structure, merge all header rows
  if (particularsRow >= 0 && debitCreditRow >= 0 && debitCreditRow > particularsRow) {
    const headerStart = Math.min(particularsRow, openingRow >= 0 ? openingRow : particularsRow);
    const headerEnd = debitCreditRow;

    // Find max columns
    let maxCols = 0;
    for (let i = headerStart; i <= headerEnd; i++) {
      if (i < rows2D.length && Array.isArray(rows2D[i])) {
        maxCols = Math.max(maxCols, rows2D[i].length);
      }
    }

    // Merge column-by-column across all header rows
    const merged: string[] = [];
    for (let c = 0; c < maxCols; c++) {
      const parts: string[] = [];
      for (let i = headerStart; i <= headerEnd; i++) {
        if (i < rows2D.length && Array.isArray(rows2D[i]) && c < rows2D[i].length) {
          const val = String(rows2D[i][c] ?? '').trim();
          if (val && val.toLowerCase() !== 'none' && val !== '') {
            parts.push(val);
          }
        }
      }
      let combined = parts.join(' ').replace(/\s+/g, ' ').trim();
      if (!combined) combined = `Column_${c + 1}`;
      merged.push(normalizeHeaderName(combined));
    }

    return { headers: deduplicateHeaders(merged), dataStartIndex: headerEnd + 1 };
  }

  // Fallback: use 2-row header detection
  const headerIndex = findHeaderRowIndex(rows2D);
  const row1 = rows2D[headerIndex] || [];
  const row2 = rows2D[headerIndex + 1] || [];

  const row2Str = row2.map(c => String(c ?? '').toLowerCase()).join(' ');
  const isSubHeader = row2Str.includes('debit') || row2Str.includes('credit') || row2Str.includes('balance') || row2Str.includes('opening');

  const combinedHeaders: string[] = [];
  let lastParent = '';
  const maxCols = Math.max(row1.length, isSubHeader ? row2.length : 0);

  for (let c = 0; c < maxCols; c++) {
    let val1 = row1[c] !== undefined && row1[c] !== null ? String(row1[c]).trim() : '';
    let val2 = isSubHeader && row2[c] !== undefined && row2[c] !== null ? String(row2[c]).trim() : '';

    if (val1 && val1.toLowerCase() !== 'none') {
      lastParent = val1;
    } else {
      val1 = lastParent;
    }

    let combined = val1;
    if (isSubHeader && val2 && val2.toLowerCase() !== 'none') {
      if (val1.toLowerCase().includes(val2.toLowerCase())) {
        combined = val1;
      } else if (val2.toLowerCase().includes(val1.toLowerCase())) {
        combined = val2;
      } else {
        combined = `${val1} ${val2}`.trim();
      }
    }

    if (!combined) combined = `Column_${c + 1}`;
    combinedHeaders.push(normalizeHeaderName(combined));
  }

  return {
    headers: deduplicateHeaders(combinedHeaders),
    dataStartIndex: isSubHeader ? headerIndex + 2 : headerIndex + 1
  };
};

/**
 * Normalize a combined header to a canonical field name.
 * Handles cases like "Opening Balance Debit" → "Debit" (Debit takes priority)
 */
const normalizeHeaderName = (raw: string): string => {
  const lower = raw.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

  if (lower === 'particulars' || lower === 'column 1' || lower === 'column1') return 'Particulars';

  // Debit/Credit must be checked BEFORE Opening/Closing to handle
  // cases like "Opening Balance Debit" (produced by bad lastParent inheritance)
  if (lower.includes('debit') && !lower.includes('opening') && !lower.includes('closing')) return 'Debit';
  if (lower.includes('credit') && !lower.includes('opening') && !lower.includes('closing')) return 'Credit';

  // Also catch "Opening Balance Debit" → this should be "Debit"
  if (lower.includes('debit')) return 'Debit';
  if (lower.includes('credit')) return 'Credit';

  // Opening/Closing Balance
  if (lower.includes('opening') && lower.includes('balance')) return 'Opening Balance';
  if (lower === 'opening') return 'Opening Balance';
  if (lower.includes('closing') && lower.includes('balance')) return 'Closing Balance';
  if (lower === 'closing') return 'Closing Balance';
  if (lower === 'balance') return 'Opening Balance';

  // Transactions alone
  if (lower === 'transactions') return 'Transactions';

  return raw;
};

const deduplicateHeaders = (headers: string[]): string[] => {
  const seen: Record<string, number> = {};
  return headers.map(h => {
    if (h in seen) {
      // If "Opening Balance" appears twice, second is likely "Closing Balance"
      if (h === 'Opening Balance' && !('Closing Balance' in seen)) {
        seen['Closing Balance'] = 1;
        return 'Closing Balance';
      }
      seen[h]++;
      return `${h}_${seen[h]}`;
    }
    seen[h] = 1;
    return h;
  });
};

export const parseExcelFile = async (file: File): Promise<ParsedWorkbookResult> => {
  // 1. Attempt parsing via Python Script API route (/api/parse-excel) with 30s timeout
  try {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const apiRes = await fetch('/api/parse-excel', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (apiRes.ok) {
      const pyResult = await apiRes.json();
      if (pyResult.success && pyResult.data && pyResult.data.sheets) {
        const sheetResults: SheetMapping[] = [];

        for (const s of pyResult.data.sheets) {
          const headers: string[] = s.headers || [];
          const validRows: Record<string, any>[] = s.records || [];

          if (validRows.length === 0) continue;

          const datasetType: DatasetType = classifyDatasetType(headers);
          const sampleRows = validRows.slice(0, 5);

          const columnMappings = headers.map((header: string, colIdx: number) => {
            const mapping = autoMapColumn(header, colIdx, headers.length);
            return {
              excelHeader: header,
              targetField: mapping.targetField,
              confidence: mapping.confidence,
              sampleValue: sampleRows[0]?.[header] ?? '',
            };
          });

          const validationErrors: { row: number; column: string; message: string }[] = [];
          validRows.forEach((row: Record<string, any>, idx: number) => {
            const errs = validateFinancialRecord(row, idx + 1);
            validationErrors.push(...errs);
          });

          sheetResults.push({
            sheetName: s.sheetName,
            datasetType,
            totalRows: validRows.length,
            headers,
            sampleRows,
            rawRows: validRows,
            columnMappings,
            validationErrors,
            grandTotal: s.grandTotal || null,
          });
        }

        if (sheetResults.length > 0) {
          return {
            fileName: file.name,
            fileSize: file.size,
            sheets: sheetResults,
          };
        }
      }
    }
  } catch (pyErr) {
    console.warn('Python API Excel parsing failed, falling back to browser parser', pyErr);
  }

  // 2. Fallback In-Browser Parsing (JS/XLSX)
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });

  const sheetResults: SheetMapping[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows2D = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

    if (!rows2D || rows2D.length === 0) continue;

    // Use the new multi-level header merger
    const { headers: combinedHeaders, dataStartIndex } = findAndMergeHeaders(rows2D);
    const rawRows2D = rows2D.slice(dataStartIndex);

    let jsGrandTotal: Record<string, any> | null = null;
    const validRows: Record<string, any>[] = [];

    for (const row of rawRows2D) {
      if (!Array.isArray(row) || row.length === 0) continue;
      const nonCount = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '').length;
      if (nonCount === 0) continue;

      const firstVal = String(row[0] || '').toLowerCase().trim();
      if (firstVal.includes('grand total') || firstVal.startsWith('total')) {
        const record: Record<string, any> = {};
        combinedHeaders.forEach((h, colIdx) => {
          record[h] = row[colIdx] !== undefined ? row[colIdx] : '';
        });
        jsGrandTotal = record;
        continue;
      }

      if (
        firstVal.includes('group summary') ||
        firstVal.includes('sundry creditors') ||
        firstVal.includes('sundry debtors') ||
        firstVal.includes('creditor for') ||
        firstVal.includes('debtor for') ||
        firstVal.includes('debtors of')
      ) continue;

      const record: Record<string, any> = {};
      combinedHeaders.forEach((h, colIdx) => {
        record[h] = row[colIdx] !== undefined ? row[colIdx] : '';
      });

      validRows.push(record);
    }

    if (validRows.length === 0) continue;

    const headers = Object.keys(validRows[0]);
    const datasetType: DatasetType = classifyDatasetType(headers);
    const sampleRows = validRows.slice(0, 5);

    const columnMappings = headers.map((header, colIdx) => {
      const mapping = autoMapColumn(header, colIdx, headers.length);
      return {
        excelHeader: header,
        targetField: mapping.targetField,
        confidence: mapping.confidence,
        sampleValue: sampleRows[0]?.[header] ?? '',
      };
    });

    const validationErrors: { row: number; column: string; message: string }[] = [];
    validRows.forEach((row, idx) => {
      const errs = validateFinancialRecord(row, idx + 1);
      validationErrors.push(...errs);
    });

    sheetResults.push({
      sheetName,
      datasetType,
      totalRows: validRows.length,
      headers,
      sampleRows,
      rawRows: validRows,
      columnMappings,
      validationErrors,
      grandTotal: jsGrandTotal,
    });
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    sheets: sheetResults,
  };
};

export const transformSheetToTransactions = (
  file: File | { name: string },
  sheetName: string,
  rawRows: Record<string, any>[],
  mappings: { excelHeader: string; targetField: string }[],
  datasetType: DatasetType,
  importId: string
): FinancialTransaction[] => {
  const headerToFieldMap = new Map<string, string>();
  mappings.forEach(m => {
    if (m.targetField && m.targetField !== 'unmapped') {
      headerToFieldMap.set(m.excelHeader, m.targetField);
    }
  });

  return rawRows.map((row, idx) => {
    const extracted: Record<string, any> = {};

    Object.entries(row).forEach(([header, val]) => {
      const target = headerToFieldMap.get(header);
      if (target) {
        extracted[target] = val;
      }
    });

    const partyType =
      datasetType === 'sales' || datasetType === 'receivables'
        ? 'customer'
        : datasetType === 'purchases' || datasetType === 'payables'
        ? 'vendor'
        : 'other';

    const voucherType = extracted.voucherType || (
      datasetType === 'sales' ? 'Sales' :
      datasetType === 'purchases' ? 'Purchase' :
      datasetType === 'expenses' ? 'Payment' :
      datasetType === 'receivables' ? 'Receipt' :
      datasetType === 'payables' ? 'Payment' : 'Journal'
    );

    const isPayable = datasetType === 'payables' || datasetType === 'purchases';
    const isReceivable = datasetType === 'receivables' || datasetType === 'sales';
    const debit = parseAmount(extracted.debit);
    const credit = parseAmount(extracted.credit);
    const openingBalance = parseBalanceAmount(extracted.openingBalance, isPayable);
    const closingBalance = extracted.closingBalance !== undefined && extracted.closingBalance !== ''
      ? parseBalanceAmount(extracted.closingBalance, isPayable)
      : (isPayable ? openingBalance + credit - debit : openingBalance + debit - credit);
    const grossTotal = parseAmount(extracted.grossTotal);
    const saleAmount = parseAmount(extracted.saleAmount);
    const value = parseAmount(extracted.value || saleAmount || grossTotal);
    const totalAmount = grossTotal || Math.abs(closingBalance) || (debit || credit || parseAmount(extracted.totalAmount || extracted.amount));
    const amount = parseAmount(extracted.amount || saleAmount || totalAmount);
    const taxAmount = parseAmount(extracted.taxAmount);

    const primaryDate = row['Date'] || row['date'] || row['Voucher Date'] || row['Voucher date'] || row['Txn Date'] || extracted.date;

    return {
      id: `txn_${importId}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      sourceImportId: importId,
      date: parseDate(primaryDate),
      voucherNo: String(extracted.voucherNo || `VCH-${idx + 1001}`),
      voucherType,
      voucherRefNo: extracted.voucherRefNo ? String(extracted.voucherRefNo) : undefined,
      partyName: String(
        extracted.partyName ||
          extracted.particulars ||
          row.Column_1 ||
          row.column_1 ||
          row.Column_0 ||
          row.Particulars ||
          Object.values(row).find(v => v && String(v).trim() !== '') ||
          'Cash Customer'
      ),
      partyType,
      gstin: extracted.gstin ? String(extracted.gstin) : undefined,
      panNo: extracted.panNo ? String(extracted.panNo) : undefined,
      ledgerName: String(extracted.ledgerName || (datasetType === 'sales' ? 'Sales Account' : datasetType === 'purchases' ? 'Purchase Account' : 'General Ledger')),
      ledgerCategory: extracted.itemCategory || datasetType,
      itemName: extracted.itemName ? String(extracted.itemName) : undefined,
      itemCategory: extracted.itemCategory ? String(extracted.itemCategory) : undefined,
      quantity: parseAmount(extracted.quantity),
      rate: parseAmount(extracted.rate),
      value,
      grossTotal,
      saleAmount,
      roundOff: parseAmount(extracted.roundOff),
      workContract: parseAmount(extracted.workContract),
      transportationCharges: parseAmount(extracted.transportationCharges),
      openingBalance,
      closingBalance,
      debit,
      credit,
      amount,
      taxAmount,
      cgst: parseAmount(extracted.cgst),
      sgst: parseAmount(extracted.sgst),
      igst: parseAmount(extracted.igst),
      totalAmount,
      dueDate: extracted.dueDate ? parseDate(extracted.dueDate) : undefined,
      overdueDays: extracted.overdueDays ? parseAmount(extracted.overdueDays) : 0,
      paymentStatus: (datasetType === 'receivables' || datasetType === 'payables') ? 'unpaid' : 'paid',
      description: extracted.description ? String(extracted.description) : `Imported from ${file.name} [${sheetName}]`,
    };
  });
};
