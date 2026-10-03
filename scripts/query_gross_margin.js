const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = trimmed.split('=')[1].trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = trimmed.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function inspectGrossMargin() {
  console.log('=== INVESTIGATING GROSS MARGIN IN DATABASE ===\n');

  // 1. Fetch active snapshots
  const { data: snapshots } = await supabase.from('snapshots').select('*');
  const activeSnapshots = snapshots.filter(s => s.status === 'active');
  const activeSalesSnaps = activeSnapshots.filter(s => s.module === 'sales').map(s => s.id);
  const activePurchaseSnaps = activeSnapshots.filter(s => s.module === 'purchases').map(s => s.id);

  console.log(`Active Sales Snapshot IDs:`, activeSalesSnaps);
  console.log(`Active Purchase Snapshot IDs:`, activePurchaseSnaps);

  // 2. Query Sales Transactions (all columns)
  let totalSales = 0;
  let salesCount = 0;
  if (activeSalesSnaps.length > 0) {
    const { data: salesTxns, error: sErr } = await supabase
      .from('sales_transactions')
      .select('*')
      .in('snapshot_id', activeSalesSnaps);

    if (sErr) console.error('Sales Txns Error:', sErr);
    else if (salesTxns) {
      salesCount = salesTxns.length;
      salesTxns.forEach(t => {
        const p = String(t.party_name || t.particulars || '').toLowerCase().trim();
        if (p.includes('grand total') || p === 'total' || p.startsWith('total ')) return;
        const val = Number(t.gross_total || t.value || t.sale_amount || 0);
        totalSales += val;
      });
    }
  }

  // 3. Query Purchases Transactions (all columns)
  let totalPurchases = 0;
  let purchasesCount = 0;
  if (activePurchaseSnaps.length > 0) {
    const { data: purchTxns, error: pErr } = await supabase
      .from('purchases_transactions')
      .select('*')
      .in('snapshot_id', activePurchaseSnaps);

    if (pErr) console.error('Purchases Txns Error:', pErr);
    else if (purchTxns) {
      purchasesCount = purchTxns.length;
      purchTxns.forEach(t => {
        const p = String(t.party_name || t.particulars || '').toLowerCase().trim();
        if (p.includes('grand total') || p === 'total' || p.startsWith('total ')) return;
        const val = Number(t.gross_total || t.value || t.purchases_ac || t.amount || 0);
        totalPurchases += val;
      });
    }
  }

  const grossProfit = totalSales - totalPurchases;
  const grossMarginPct = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

  console.log('\n=== REAL DATABASE MATHEMATICAL BREAKDOWN ===');
  console.log(`Total Sales Count: ${salesCount} records`);
  console.log(`Total Sales Amount: ₹${totalSales.toLocaleString('en-IN')}`);
  console.log(`Total Purchases Count: ${purchasesCount} records`);
  console.log(`Total Purchases Amount: ₹${totalPurchases.toLocaleString('en-IN')}`);
  console.log(`Gross Profit (Sales - Purchases): ₹${grossProfit.toLocaleString('en-IN')}`);
  console.log(`Gross Margin %: ${grossMarginPct.toFixed(2)}%`);
}

inspectGrossMargin().catch(console.error);
