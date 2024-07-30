#!/usr/bin/env node
// run-migration.js
// Applies the Supabase migration via direct pg connection
// Usage: node run-migration.js

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Try multiple connection methods
const connections = [
  // Direct connection
  {
    label: 'Direct DB (IPv4 forced)',
    host: 'db.ciymlfapbhcibaycfdzo.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'AuthCrypto123!',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    family: 4,
  },
  // Session pooler us-east-1
  {
    label: 'Pooler us-east-1 (session, port 5432)',
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.ciymlfapbhcibaycfdzo',
    password: 'AuthCrypto123!',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  },
  // Transaction pooler us-east-1
  {
    label: 'Pooler us-east-1 (transaction, port 6543)',
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ciymlfapbhcibaycfdzo',
    password: 'AuthCrypto123!',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  },
  // Session pooler eu-west-1
  {
    label: 'Pooler eu-west-1 (session, port 5432)',
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.ciymlfapbhcibaycfdzo',
    password: 'AuthCrypto123!',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  },
  // Transaction pooler eu-west-1
  {
    label: 'Pooler eu-west-1 (transaction, port 6543)',
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ciymlfapbhcibaycfdzo',
    password: 'AuthCrypto123!',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  },
  // Session pooler us-west-2
  {
    label: 'Pooler us-west-2 (session, port 5432)',
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.ciymlfapbhcibaycfdzo',
    password: 'AuthCrypto123!',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  },
];

const sqlFile = path.join(__dirname, 'supabase/migrations/20260416000000_initial_schema.sql');

async function tryConnection(config) {
  const { label, ...pgConfig } = config;
  const client = new Client(pgConfig);
  try {
    console.log(`\n🔌 Trying: ${label}`);
    await client.connect();
    console.log(`✅ Connected! Running migration...`);
    const sql = fs.readFileSync(sqlFile, 'utf8');
    await client.query(sql);
    console.log('\n✅ Migration applied successfully!\n');
    await client.end();
    return true;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}`);
    try { await client.end(); } catch {}
    return false;
  }
}

async function main() {
  if (!fs.existsSync(sqlFile)) {
    console.error('❌ Migration file not found:', sqlFile);
    process.exit(1);
  }

  console.log('🚀 Crypto Payments - Database Migration Runner');
  console.log('==============================================');

  for (const conn of connections) {
    const success = await tryConnection(conn);
    if (success) {
      console.log('🎉 Database is ready. Tables created:');
      console.log('   - public.business_profiles (with RLS)');
      console.log('   - public.payments (with RLS)');
      process.exit(0);
    }
  }

  console.error('\n❌ All connection methods failed.');
  console.error('\n📋 Manual option: Copy and run the SQL in your Supabase Dashboard:');
  console.error('   https://supabase.com/dashboard/project/ciymlfapbhcibaycfdzo/editor');
  console.error(`   File: ${sqlFile}`);
  process.exit(1);
}

main();
