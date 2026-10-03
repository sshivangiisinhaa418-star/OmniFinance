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

async function debugTotals() {
  console.log('=== DEBUGGING DB RECORD VALUES ===');

  // Query Sales
  const { data: sales } = await supabase.from('sales_transactions').select('*');
  console.log(`Total Sales Rows in DB: ${sales ? sales.length : 0}`);
  
  let salesGrossSum = 0;
  let salesValueSum = 0;
  let salesSaleAmtSum = 0;
  
  if (sales) {
    sales.forEach(r => {
      const p = String(r.party_name || r.particulars || '').toLowerCase().trim();
      if (p.includes('grand total') || p === 'total' || p.startsWith('total ')) return;
      salesGrossSum += Number(r.gross_total || 0);
      salesValueSum += Number(r.value || 0);
      salesSaleAmtSum += Number(r.sale_amount || 0);
    });
  }

  console.log('Sales gross_total sum:', salesGrossSum.toLocaleString('en-IN'));
  console.log('Sales value sum:', salesValueSum.toLocaleString('en-IN'));
  console.log('Sales sale_amount sum:', salesSaleAmtSum.toLocaleString('en-IN'));

  // Query Purchases
  const { data: purch } = await supabase.from('purchases_transactions').select('*');
  console.log(`\nTotal Purchases Rows in DB: ${purch ? purch.length : 0}`);
  
  let purchGrossSum = 0;
  let purchValueSum = 0;
  let purchAcSum = 0;
  
  if (purch) {
    purch.forEach(r => {
      const p = String(r.party_name || r.particulars || '').toLowerCase().trim();
      if (p.includes('grand total') || p === 'total' || p.startsWith('total ')) return;
      purchGrossSum += Number(r.gross_total || 0);
      purchValueSum += Number(r.value || 0);
      purchAcSum += Number(r.purchases_ac || 0);
    });
  }

  console.log('Purchases gross_total sum:', purchGrossSum.toLocaleString('en-IN'));
  console.log('Purchases value sum:', purchValueSum.toLocaleString('en-IN'));
  console.log('Purchases purchases_ac sum:', purchAcSum.toLocaleString('en-IN'));

  if (sales && sales.length > 0) {
    console.log('\nSample 3 Sales Rows:');
    console.log(sales.slice(0, 3).map(r => ({ id: r.id, party: r.party_name, gross: r.gross_total, sale_amount: r.sale_amount, value: r.value })));
  }

  if (purch && purch.length > 0) {
    console.log('\nSample 3 Purchase Rows:');
    console.log(purch.slice(0, 3).map(r => ({ id: r.id, party: r.party_name, gross: r.gross_total, purchases_ac: r.purchases_ac, value: r.value })));
  }
}

debugTotals().catch(console.error);
