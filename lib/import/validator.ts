// Clean and parse financial numbers
export const parseAmount = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;

  const isNegative = /^\(.*\)$/.test(str) || str.endsWith('-') || str.startsWith('-');

  let cleaned = str;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length === 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const cleanNumeric = cleaned.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleanNumeric);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : Math.abs(num);
};

// Clean and parse financial balance amounts taking Dr/Cr into account
export const parseBalanceAmount = (val: any, isPayable: boolean = false): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  const lower = str.toLowerCase();
  const num = parseAmount(str);
  if (isNaN(num) || num === 0) return 0;

  if (lower.includes('dr')) {
    return isPayable ? -Math.abs(num) : Math.abs(num);
  }
  if (lower.includes('cr')) {
    return isPayable ? Math.abs(num) : -Math.abs(num);
  }

  return num;
};

// ============================================================
// COMPREHENSIVE TALLY / GST UNIT OF MEASUREMENT (UOM) DICTIONARY
// ============================================================
export interface ParsedQuantityUnit {
  quantity: number;
  unit?: string;       // e.g. 'MT', 'NOS', 'KG', 'PCS', 'BOX', etc.
  unitName?: string;   // e.g. 'Metric Ton', 'Numbers (Nos)', 'Kilograms (Kg)', etc.
  formatted: string;   // e.g. '10.500 MT (Metric Ton)' or '500 Nos'
}

interface UnitInfo {
  code: string;
  name: string;
}

const UNIT_PATTERNS: { regex: RegExp; code: string; name: string }[] = [
  // Metric Ton / Tonne / MT
  { regex: /\b(mt|mts|m\.t\.|metric\s*ton|metric\s*tons|metric\s*tonne|tonne|tonnes|tons?)\b/i, code: 'MT', name: 'Metric Ton' },
  // Numbers / Units / Pieces
  { regex: /\b(nos\.?|numbers?|num\.?)\b/i, code: 'NOS', name: 'Numbers (Nos)' },
  { regex: /\b(pcs\.?|pieces?)\b/i, code: 'PCS', name: 'Pieces (Pcs)' },
  { regex: /\b(units?)\b/i, code: 'UNT', name: 'Units' },
  // Weight: Kilograms / Grams / Quintal
  { regex: /\b(kgs?\.?|kilos?|kilograms?)\b/i, code: 'KG', name: 'Kilograms (Kg)' },
  { regex: /\b(gms?\.?|grams?)\b/i, code: 'GM', name: 'Grams (Gm)' },
  { regex: /\b(qtls?\.?|qntls?\.?|quintals?)\b/i, code: 'QTL', name: 'Quintals (Qtl)' },
  // Volume: Litres / Millilitres
  { regex: /\b(ltrs?\.?|litres?|liters?)\b/i, code: 'LTR', name: 'Litres (Ltr)' },
  { regex: /\b(mls?\.?|millilitres?|milliliters?)\b/i, code: 'ML', name: 'Millilitres (ml)' },
  // Length: Metres / Kilometres
  { regex: /\b(mtrs?\.?|metres?|meters?)\b/i, code: 'MTR', name: 'Metres (Mtr)' },
  { regex: /\b(kms?\.?|kilometres?|kilometers?)\b/i, code: 'KM', name: 'Kilometres (Km)' },
  // Area: Square Metre / Square Feet
  { regex: /\b(sqm|sq\.?\s*mtr?|sq\.?\s*m|square\s*metres?)\b/i, code: 'SQM', name: 'Square Metres (Sq.m)' },
  { regex: /\b(sqf|sq\.?\s*ft|square\s*feet)\b/i, code: 'SQF', name: 'Square Feet (Sq.ft)' },
  // Volume / Capacity
  { regex: /\b(cum|cu\.?\s*m|cubic\s*metres?)\b/i, code: 'CUM', name: 'Cubic Metres (Cu.m)' },
  // Packaging Units
  { regex: /\b(boxes|box|bx)\b/i, code: 'BOX', name: 'Boxes (Box)' },
  { regex: /\b(bags?|bg)\b/i, code: 'BAG', name: 'Bags (Bag)' },
  { regex: /\b(bndls?|bundles?)\b/i, code: 'BNDL', name: 'Bundles (Bndl)' },
  { regex: /\b(pkts?\.?|packets?|packs?)\b/i, code: 'PKT', name: 'Packets (Pkt)' },
  { regex: /\b(ctns?\.?|cartons?)\b/i, code: 'CTN', name: 'Cartons (Ctn)' },
  { regex: /\b(rolls?|rol)\b/i, code: 'ROLL', name: 'Rolls (Roll)' },
  { regex: /\b(btls?\.?|bottles?)\b/i, code: 'BTL', name: 'Bottles (Btl)' },
  { regex: /\b(cans?)\b/i, code: 'CAN', name: 'Cans (Can)' },
  { regex: /\b(drums?|drm)\b/i, code: 'DRUM', name: 'Drums (Drum)' },
  { regex: /\b(dozens?|doz)\b/i, code: 'DOZ', name: 'Dozen (Doz)' },
  { regex: /\b(sets?)\b/i, code: 'SET', name: 'Sets (Set)' },
  { regex: /\b(pairs?|prs)\b/i, code: 'PAIR', name: 'Pairs (Prs)' },
  { regex: /\b(thsd?|thousands?|ths)\b/i, code: 'THD', name: 'Thousands (Thd)' },
  { regex: /\b(lots?)\b/i, code: 'LOT', name: 'Lots (Lot)' },
];

/**
 * Robust extractor for Quantity and its Unit of Measurement (e.g., '10.500 MT', '500 NOS', '1250 KGS')
 * Extracts the numeric quantity, the standardized unit code ('MT'), and the full name ('Metric Ton').
 */
export const parseQuantityWithUnit = (
  val: any,
  headerHint?: string,
  adjacentUnit?: string
): ParsedQuantityUnit => {
  if (val === null || val === undefined || val === '') {
    return { quantity: 0, formatted: '0' };
  }

  let rawStr = String(val).trim();
  let foundUnit: UnitInfo | null = null;

  // 1. Check if the cell value itself contains a unit suffix/prefix (e.g. "10.500 MT", "500 NOS")
  for (const p of UNIT_PATTERNS) {
    if (p.regex.test(rawStr)) {
      foundUnit = { code: p.code, name: p.name };
      break;
    }
  }

  // 2. If cell had no unit, check adjacent unit column value
  if (!foundUnit && adjacentUnit && String(adjacentUnit).trim() !== '') {
    const adjStr = String(adjacentUnit).trim();
    for (const p of UNIT_PATTERNS) {
      if (p.regex.test(adjStr)) {
        foundUnit = { code: p.code, name: p.name };
        break;
      }
    }
    if (!foundUnit && adjStr.length <= 6) {
      foundUnit = { code: adjStr.toUpperCase(), name: adjStr };
    }
  }

  // 3. If still no unit, check column header for hint (e.g. "Billed Qty (MT)", "Qty (NOS)")
  if (!foundUnit && headerHint) {
    for (const p of UNIT_PATTERNS) {
      if (p.regex.test(headerHint)) {
        foundUnit = { code: p.code, name: p.name };
        break;
      }
    }
  }

  // Extract the numeric part cleanly (handles commas, negative signs, decimals)
  const isNegative = /^\(.*\)$/.test(rawStr) || rawStr.endsWith('-');
  const cleanNumeric = rawStr.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleanNumeric);
  const qty = isNaN(num) ? 0 : (isNegative ? -num : num);

  let formatted = qty.toLocaleString('en-IN', { maximumFractionDigits: 3 });
  if (foundUnit) {
    formatted = `${formatted} ${foundUnit.code}`;
  }

  return {
    quantity: qty,
    unit: foundUnit?.code,
    unitName: foundUnit?.name,
    formatted,
  };
};

// Months lookup used for date parsing
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * parseDate: Converts any Excel / Tally date representation into ISO "YYYY-MM-DD" format
 * Robust against 2024, 2025, 2026, 2027, 2028 multi-year exports, Excel serial numbers,
 * slash/hyphen formats, and Tally-specific representations.
 */
export const parseDate = (val: any): string => {
  if (val === null || val === undefined || val === '') return '';

  // JS Date object (returned by XLSX when cellDates: true)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Excel Serial Date number (e.g. 45190 for 2023, 45658 for 2025, 46023 for 2026, 46388 for 2027)
  if (typeof val === 'number' && val > 0 && val < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();

  // If string is an integer serial date like "45658"
  if (/^\d{5}$/.test(str)) {
    const numSerial = parseInt(str, 10);
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + numSerial * 86400000);
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Already ISO: "2025-04-01" or "2026-04-01T00:00:00"
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(str)) {
    const parts = str.substring(0, 10).split('/');
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Tally format: "01-Apr-25", "1-Apr-2025", "31-Mar-27"
  const tallyMatch = str.match(/^(\d{1,2})-([A-Za-z]{3,9})-(\d{2,4})$/);
  if (tallyMatch) {
    const day = tallyMatch[1].padStart(2, '0');
    const monStr = tallyMatch[2];
    const yearPart = tallyMatch[3];
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
    let monIdx = MONTHS_SHORT.findIndex(m => m.toLowerCase() === monStr.toLowerCase().substring(0, 3));
    if (monIdx === -1) {
      monIdx = MONTHS_FULL.findIndex(m => m.toLowerCase().startsWith(monStr.toLowerCase()));
    }
    const month = String(monIdx >= 0 ? monIdx + 1 : 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY (e.g. 01/04/2025 or 1-4-2026)
  const dmyMatch = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const yearPart = dmyMatch[3];
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;

    // Standard Indian / Tally format is DD/MM/YYYY
    let day = String(p1).padStart(2, '0');
    let month = String(p2).padStart(2, '0');

    // If second number > 12, it must be MM/DD/YYYY
    if (p2 > 12 && p1 <= 12) {
      month = String(p1).padStart(2, '0');
      day = String(p2).padStart(2, '0');
    }

    return `${year}-${month}-${day}`;
  }

  // Month-Year format (e.g. "Apr-25", "April 2026")
  const myMatch = str.match(/^([A-Za-z]{3,9})[\s\-](\d{2,4})$/);
  if (myMatch) {
    const monStr = myMatch[1];
    const yearPart = myMatch[2];
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
    const monIdx = MONTHS_SHORT.findIndex(m => m.toLowerCase() === monStr.toLowerCase().substring(0, 3));
    const month = String(monIdx >= 0 ? monIdx + 1 : 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }

  return str;
};

/**
 * formatDateDisplay: Converts ISO "YYYY-MM-DD" or any raw date value into
 * human-readable "DD-Mon-YY" format (e.g. "01-Apr-26") for table display.
 */
export const formatDateDisplay = (val: any): string => {
  if (val === null || val === undefined || val === '') return '-';
  const isoStr = typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val) ? val : parseDate(val);
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}/.test(isoStr)) return String(val || '-');
  const parts = isoStr.substring(0, 10).split('-');
  const year = parts[0].substring(2);
  const monIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2];
  return `${day}-${MONTHS_SHORT[monIdx] || 'Jan'}-${year}`;
};

export interface RowValidationError {
  row: number;
  column: string;
  message: string;
}

export const validateFinancialRecord = (
  row: Record<string, any>,
  rowIndex: number
): RowValidationError[] => {
  const errors: RowValidationError[] = [];

  if (!row.partyName && !row.particulars) {
    errors.push({ row: rowIndex, column: 'partyName', message: 'Missing party or customer name' });
  }

  return errors;
};
