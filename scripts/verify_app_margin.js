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

async function verifyAppMargin() {
  console.log('=== SIMULATING EXACT APP DATA LOADING ===\n');

  // Load Sales
  const { data: salesSnaps } = await supabase.from('snapshots').select('*').eq('module', 'sales').eq('status', 'active');
  const salesSnapIds = salesSnaps.map(s => s.id);
  
  let salesData = [];
  if (salesSnapIds.length > 0) {
    const { data: sRows } = await supabase.from('sales_transactions').select('*').in('snapshot_id', salesSnapIds);
    salesData = sRows || [];
  }

  // Load Purchases
  const { data: purchSnaps } = await supabase.from('snapshots').select('*').eq('module', 'purchases').eq('status', 'active');
  const purchSnapIds = purchSnaps.map(s => s.id);

  let purchData = [];
  if (purchSnapIds.length > 0) {
    const { data: pRows } = await supabase.from('purchases_transactions').select('*').in('snapshot_id', purchSnapIds);
    purchData = pRows || [];
  }

  // Filter valid party names (same as lib/storage.ts)
  const validSales = salesData.filter(d => {
    const p = String(d.party_name || d.particulars || '').toLowerCase().trim();
    return !p.includes('grand total') && p !== 'total' && !p.startsWith('total ') && p !== 'total vouchers';
  });

  const validPurchases = purchData.filter(d => {
    const p = String(d.party_name || d.particulars || '').toLowerCase().trim();
    return !p.includes('grand total') && p !== 'total' && !p.startsWith('total ') && p !== 'total vouchers';
  });

  // Map to transaction objects (same as lib/storage.ts)
  const mappedSales = validSales.map(d => {
    const igst = Number(d.igst) || 0;
    const cgst = Number(d.cgst) || 0;
    const sgst = Number(d.sgst) || 0;
    const taxSum = igst + cgst + sgst;
    const roundOff = Number(d.round_off) || 0;
    const rawGross = Number(d.gross_total) || Number(d.amount) || 0;
    const rawSale = d.sale_amount !== null && d.sale_amount !== undefined && !isNaN(Number(d.sale_amount)) ? Number(d.sale_amount) : undefined;
    const rawValue = d.value !== null && d.value !== undefined && !isNaN(Number(d.value)) ? Number(d.value) : undefined;
    const value = rawValue !== undefined ? rawValue : (rawSale !== undefined ? rawSale : (rawGross > taxSum ? rawGross - taxSum - roundOff : rawGross));
    const grossTotal = rawGross || (value ? value + taxSum + roundOff : 0);
    const saleAmount = rawSale !== undefined ? rawSale : (value || grossTotal);
    return {
      grossTotal,
      saleAmount,
      value,
      totalAmount: grossTotal,
      amount: grossTotal
    };
  });

  const mappedPurchases = validPurchases.map(d => {
    const igst = Number(d.igst) || Number(d.input_igst_silvassa) || 0;
    const cgst = Number(d.cgst) || Number(d.input_cgst_silvassa) || 0;
    const sgst = Number(d.sgst) || Number(d.input_sgst_silvassa) || 0;
    const taxSum = igst + cgst + sgst;
    const roundOff = Number(d.round_off) || 0;
    const rawGross = Number(d.gross_total) || Number(d.amount) || 0;
    const rawSale = d.purchases_ac !== null && d.purchases_ac !== undefined && !isNaN(Number(d.purchases_ac)) ? Number(d.purchases_ac) : undefined;
    const rawValue = d.value !== null && d.value !== undefined && !isNaN(Number(d.value)) ? Number(d.value) : undefined;
    const value = rawValue !== undefined ? rawValue : (rawSale !== undefined ? rawSale : (rawGross > taxSum ? rawGross - taxSum - roundOff : rawGross));
    const grossTotal = rawGross || (value ? value + taxSum + roundOff : 0);
    return {
      grossTotal,
      value,
      amount: grossTotal
    };
  });

  const totalSales = mappedSales.reduce((s, t) => s + (t.grossTotal || t.saleAmount || t.totalAmount || t.amount || 0), 0);
  const totalPurchases = mappedPurchases.reduce((s, t) => s + (t.grossTotal || t.value || t.amount || 0), 0);
  const grossProfit = totalSales - totalPurchases;
  const grossMarginPct = totalSales > 0 ? ((totalSales - totalPurchases) / totalSales) * 100 : 0;

  console.log(`Sales Records Count: ${mappedSales.length}`);
  console.log(`Total Sales: ₹${totalSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
  console.log(`Purchases Records Count: ${mappedPurchases.length}`);
  console.log(`Total Purchases: ₹${totalPurchases.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
  console.log(`Gross Profit: ₹${grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
  console.log(`Calculated Gross Margin: ${grossMarginPct.toFixed(2)}% (rounded: ${Math.round(grossMarginPct)}%)`);
}

verifyAppMargin().catch(console.error);
