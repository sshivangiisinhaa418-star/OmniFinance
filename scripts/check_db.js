const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = trimmed.split('=')[1].trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = trimmed.split('=')[1].trim();
});

console.log('Connecting to Supabase:', url);
const supabase = createClient(url, key);

async function check() {
  const { data: snaps, error: snapErr } = await supabase.from('snapshots').select('*').order('uploaded_at', { ascending: false }).limit(10);
  if (snapErr) {
    console.error('Snapshots error:', snapErr);
    return;
  }
  console.log('Found', snaps.length, 'snapshots:');
  for (const s of snaps) {
    console.log(`- ID: ${s.id} | Module: ${s.module} | File: ${s.file_name} | Records: ${s.record_count} | Status: ${s.status} | Uploaded: ${s.uploaded_at}`);
  }

  // Check sum of value in purchases_transactions
  const { data: pTxns, error: pErr } = await supabase.from('purchases_transactions').select('value, gross_total, purchases_ac, snapshot_id').limit(100);
  if (pErr) console.error('Purchases error:', pErr);
  else {
    console.log('Sample purchases_transactions count:', pTxns.length);
    if (pTxns.length > 0) {
      console.log('First 5 purchase rows:');
      pTxns.slice(0, 5).forEach(r => console.log(' ', r));
    }
  }

  // Check sum of value in sales_transactions
  const { data: sTxns, error: sErr } = await supabase.from('sales_transactions').select('value, gross_total, sale_amount, snapshot_id').limit(100);
  if (sErr) console.error('Sales error:', sErr);
  else {
    console.log('Sample sales_transactions count:', sTxns.length);
    if (sTxns.length > 0) {
      console.log('First 5 sales rows:');
      sTxns.slice(0, 5).forEach(r => console.log(' ', r));
    }
  }
}

check().catch(console.error);
