// Clean and parse financial numbers
export const parseAmount = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// Clean and parse financial balance amounts taking Dr/Cr into account
export const parseBalanceAmount = (val: any, isPayable: boolean = false): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return 0;

  const lower = str.toLowerCase();
  if (lower.includes('dr')) {
    return isPayable ? -Math.abs(num) : Math.abs(num);
  }
  if (lower.includes('cr')) {
    return isPayable ? Math.abs(num) : -Math.abs(num);
  }

  return num;
};

// Months lookup used for date parsing
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * parseDate: Converts any Excel / Tally date representation into ISO "YYYY-MM-DD" format
 * for correct Supabase storage. The DB date column needs YYYY-MM-DD format.
 */
export const parseDate = (val: any): string => {
  if (val === null || val === undefined || val === '') return '';

  // JS Date object (returned by XLSX when cellDates: true)
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();

  // Already ISO: "2026-04-01" or "2026-04-01T00:00:00"
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  // Tally format: "01-Apr-26" or "1-Apr-2026"
  const tallyMatch = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (tallyMatch) {
    const day = tallyMatch[1].padStart(2, '0');
    const monStr = tallyMatch[2];
    const yearPart = tallyMatch[3];
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
    const monIdx = MONTHS_SHORT.findIndex(m => m.toLowerCase() === monStr.toLowerCase());
    const month = String(monIdx >= 0 ? monIdx + 1 : 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const yearPart = dmyMatch[3];
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
    return `${year}-${month}-${day}`;
  }

  // Excel Serial Date number (e.g. 45190)
  if (typeof val === 'number' && val > 0) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return str;
};

/**
 * formatDateDisplay: Converts ISO "YYYY-MM-DD" or any raw date value into
 * human-readable "DD-Mon-YY" format (e.g. "01-Apr-26") for table display.
 */
export const formatDateDisplay = (val: any): string => {
  if (val === null || val === undefined || val === '') return '';
  const isoStr = typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val) ? val : parseDate(val);
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}/.test(isoStr)) return String(val || '');
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

  if (!row.date) {
    errors.push({ row: rowIndex, column: 'date', message: 'Invalid or missing transaction date' });
  }

  return errors;
};
