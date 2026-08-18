import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const projectRef = 'dfvbtebzwgnjllbseyty';
const password = '13041971SalahGasmi';

const regions = [
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-southeast-1',
  'ap-south-1',
];

async function scanRegions() {
  const sqlScript = fs.readFileSync('supabase/schema.sql', 'utf-8');

  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const connStr = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${host}:6543/postgres`;
    
    console.log(`Testing region pooler: ${region}...`);
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000,
    });

    try {
      await client.connect();
      console.log(`\n🎉 MATCH FOUND IN REGION: ${region}! CONNECTED TO SUPABASE!`);
      console.log('⚡ Executing schema.sql migration...');
      await client.query(sqlScript);
      console.log('✅ ALL TABLES CREATED IN SUPABASE SUCCESSFULLY!');

      const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
      console.log('📋 Public Tables:', res.rows.map(r => r.table_name).join(', '));
      await client.end();
      return;
    } catch (err) {
      if (!err.message.includes('not found') && !err.message.includes('timeout')) {
        console.log(`  Response from ${region}: ${err.message}`);
      }
      await client.end().catch(() => {});
    }
  }
  console.log('\nScan completed.');
}

scanRegions();
