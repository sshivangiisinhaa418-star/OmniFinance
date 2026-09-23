import { FinancialTransaction } from '@/types';

// Simple string hash for file contents or transaction unique keys
export const generateHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hash_' + Math.abs(hash).toString(36);
};

export const getTxnFingerprint = (txn: Partial<FinancialTransaction>): string => {
  const key = [
    txn.voucherNo || '',
    txn.date || '',
    txn.partyName || '',
    txn.totalAmount || txn.amount || 0,
    txn.voucherType || ''
  ].join('|');
  return generateHash(key);
};

export const detectDuplicates = (
  newTxns: FinancialTransaction[],
  existingTxns: FinancialTransaction[]
): { uniqueTxns: FinancialTransaction[]; duplicateCount: number } => {
  const existingFingerprints = new Set(existingTxns.map(getTxnFingerprint));
  const uniqueTxns: FinancialTransaction[] = [];
  let duplicateCount = 0;

  for (const txn of newTxns) {
    const fp = getTxnFingerprint(txn);
    if (existingFingerprints.has(fp)) {
      duplicateCount++;
    } else {
      existingFingerprints.add(fp);
      uniqueTxns.push(txn);
    }
  }

  return { uniqueTxns, duplicateCount };
};
