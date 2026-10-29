const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Helper to safely load env variables from .env.local or process.env
function getEnvConfig() {
  const env = { ...process.env };
  if (fs.existsSync('.env.local')) {
    const content = fs.readFileSync('.env.local', 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
        }
      }
    });
  }
  return env;
}

const env = getEnvConfig();

// Source DB (SSL base)
const srcClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL_SSL || env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY_SSL || env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SSL || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Target BKM DB
const bkmClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL_BKM,
  env.SUPABASE_SERVICE_ROLE_KEY_BKM || env.NEXT_PUBLIC_SUPABASE_ANON_KEY_BKM
);

// Target AVL DB
const avlClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL_AVL,
  env.SUPABASE_SERVICE_ROLE_KEY_AVL || env.NEXT_PUBLIC_SUPABASE_ANON_KEY_AVL
);

const moduleTableMap = {
  sales: 'sales_transactions',
  purchases: 'purchases_transactions',
  receivables: 'receivables_transactions',
  payables: 'payables_transactions',
  payments: 'payments_transactions',
  receipts: 'receipts_transactions',
};

async function migrateData() {
  console.log('🚀 Starting initial data sync from original DB to BKM and AVL DBs...');

  // 1. Fetch all snapshots from source
  const { data: allSnaps, error: snapErr } = await srcClient.from('snapshots').select('*');
  if (snapErr || !allSnaps) {
    console.error('Failed to fetch source snapshots:', snapErr);
    return;
  }
  console.log(`Found ${allSnaps.length} total snapshots in source DB.`);

  for (const snap of allSnaps) {
    const cName = (snap.company_name || '').toUpperCase();
    const fName = (snap.file_name || '').toUpperCase();

    let targetClient = null;
    let targetEntity = '';

    if (cName.includes('BKM') || fName.includes('BKM')) {
      targetClient = bkmClient;
      targetEntity = 'BKM';
    } else if (cName.includes('AVL') || cName.includes('AVPL') || fName.includes('AVL') || fName.includes('AVPL')) {
      targetClient = avlClient;
      targetEntity = 'AVL';
    }

    if (!targetClient) {
      console.log(`Skipping snapshot ${snap.id} (${snap.file_name}) - belongs to SSL.`);
      continue;
    }

    console.log(`\n📦 Migrating snapshot [${snap.id}] for entity ${targetEntity} (${snap.module}): ${snap.file_name}`);

    // Insert snapshot into target DB
    const { error: insSnapErr } = await targetClient.from('snapshots').upsert(snap);
    if (insSnapErr) {
      console.error(`  ❌ Error inserting snapshot ${snap.id}:`, insSnapErr.message);
      continue;
    }
    console.log(`  ✅ Snapshot metadata synced.`);

    // Fetch transactions from source table
    const tableName = moduleTableMap[snap.module];
    if (!tableName) {
      console.log(`  ⚠️ No table mapping for module ${snap.module}`);
      continue;
    }

    const { data: txns, error: txnErr } = await srcClient
      .from(tableName)
      .select('*')
      .eq('snapshot_id', snap.id);

    if (txnErr) {
      console.error(`  ❌ Error fetching transactions from ${tableName}:`, txnErr.message);
      continue;
    }

    if (!txns || txns.length === 0) {
      console.log(`  ℹ️ No transactions found for snapshot ${snap.id}.`);
      continue;
    }

    console.log(`  🔄 Syncing ${txns.length} transactions into ${tableName}...`);

    // Insert in batches of 100
    const BATCH_SIZE = 100;
    let successCount = 0;
    for (let i = 0; i < txns.length; i += BATCH_SIZE) {
      const batch = txns.slice(i, i + BATCH_SIZE);
      const { error: insTxnErr } = await targetClient.from(tableName).upsert(batch);
      if (insTxnErr) {
        console.error(`    ❌ Batch ${i} error:`, insTxnErr.message);
      } else {
        successCount += batch.length;
      }
    }

    console.log(`  ✅ Migrated ${successCount}/${txns.length} transactions for ${snap.id}.`);
  }

  console.log('\n🎉 Data migration to BKM and AVL completed successfully!');
}

migrateData();
