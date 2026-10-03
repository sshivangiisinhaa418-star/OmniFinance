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

async function inspectSnapshots() {
  const { data: snaps } = await supabase.from('snapshots').select('*');
  console.log('=== SNAPSHOT HEADERS ===');
  snaps.forEach(s => {
    console.log(s);
  });
}

inspectSnapshots().catch(console.error);
