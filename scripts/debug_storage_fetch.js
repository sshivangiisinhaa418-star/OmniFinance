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

async function testStorageFetch() {
  console.log('=== TESTING STORAGE.TS FETCH ===');

  // Fetch sales
  const { data: salesSnaps } = await supabase.from('snapshots').select('*').eq('module', 'sales').eq('status', 'active');
  const salesSnapIds = salesSnaps.map(s => s.id);

  let salesData = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase.from('sales_transactions').select('*').in('snapshot_id', salesSnapIds).range(offset, offset + 999);
    if (!data || data.length === 0) break;
    salesData.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  // Fetch purchases
  const { data: purchSnaps } = await supabase.from('snapshots').select('*').eq('module', 'purchases').eq('status', 'active');
  const purchSnapIds = purchSnaps.map(s => s.id);

  let purchData = [];
  offset = 0;
  hasMore = true;
  while (hasMore) {
    const { data } = await supabase.from('purchases_transactions').select('*').in('snapshot_id', purchSnapIds).range(offset, offset + 999);
    if (!data || data.length === 0) break;
    purchData.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  console.log(`Fetched ${salesData.length} sales rows from Supabase.`);
  console.log(`Fetched ${purchData.length} purchase rows from Supabase.`);

  const validSales = salesData.filter(d => {
    const p = String(d.party_name || d.particulars || '').toLowerCase().trim();
    return !p.includes('grand total') && p !== 'total' && !p.startsWith('total ') && p !== 'total vouchers';
  });

  const validPurchases = purchData.filter(d => {
    const p = String(d.party_name || d.particulars || '').toLowerCase().trim();
    return !p.includes('grand total') && p !== 'total' && !p.startsWith('total ') && p !== 'total vouchers';
  });

  const mappedSales = validSales.map(d => {
    const igst = Number(d.igst) || 0;
    const cgst = Number(d.cgst) || 0;
    const sgst = Number(d.sgst) || 0;
    const taxSum = igst + cgst + sgst;
    const roundOff = Number(d.round_off) || 0;
    const rawGross = Number(d.gross_total) || Number(d.amount) || 0;
    const rawSale = d.sale_amount !== null && d.sale_amount !== undefined && !isNaN(Number(d.sale_amount))
      ? Number(d.sale_amount)
      : (d.purchases_ac !== null && d.purchases_ac !== undefined && !isNaN(Number(d.purchases_ac)) ? Number(d.purchases_ac) : undefined);
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
    const rawSale = d.purchases_ac !== null && d.purchases_ac !== undefined && !isNaN(Number(d.purchases_ac))
      ? Number(d.purchases_ac)
      : undefined;
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

  console.log(`Total Sales: ₹${totalSales.toLocaleString('en-IN')}`);
  console.log(`Total Purchases: ₹${totalPurchases.toLocaleString('en-IN')}`);
  console.log(`Gross Margin: ${(((totalSales - totalPurchases) / totalSales) * 100).toFixed(2)}%`);
}

testStorageFetch().catch(console.error);
