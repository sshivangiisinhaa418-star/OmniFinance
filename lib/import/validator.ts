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

// Format dates to exact DD-Mon-YY string (e.g. "01-Apr-26") matching Excel
export const parseDate = (val: any): string => {
  if (val === null || val === undefined || val === '') return '';

  const str = String(val).trim();

  // If formatted like "01-Apr-26" or "1-Apr-26", preserve as-is
  if (/^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(str)) {
    return str;
  }

  // Handle ISO date / timestamp string like "2026-04-01 00:00:00" or "2026-04-01"
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split(' ')[0].split('-');
    const year = parts[0].substring(2);
    const mIdx = parseInt(parts[1], 10) - 1;
    const day = parts[2].padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${months[mIdx] || 'Jan'}-${year}`;
  }

  // Handle JS Date object
  if (val instanceof Date) {
    const day = String(val.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[val.getMonth()];
    const year = String(val.getFullYear()).substring(2);
    return `${day}-${month}-${year}`;
  }

  // Handle Excel Serial Date (e.g. 45190)
  if (typeof val === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).substring(2);
    return `${day}-${month}-${year}`;
  }

  return str;
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
