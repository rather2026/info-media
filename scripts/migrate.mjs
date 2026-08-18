import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

const connectionString = 'postgresql://postgres:13041971SalahGasmi@db.dfvbtebzwgnjllbseyty.supabase.co:5432/postgres';

async function runMigration() {
  console.log('🔄 Connexion directe à Supabase PostgreSQL...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Required for Supabase direct SSL connection
  });

  try {
    await client.connect();
    console.log('✅ Connecté avec succès à la base de données Supabase PostgreSQL!');

    const sqlScript = fs.readFileSync('supabase/schema.sql', 'utf-8');
    console.log('⏳ Exécution du script SQL d\'initialisation (schema.sql)...');

    await client.query(sqlScript);

    console.log('🎉 TOUTES LES TABLES ET INDEX SUPABASE ONT ÉTÉ CRÉÉS AVEC SUCCÈS !');

    // Verify created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 Tables présentes dans Supabase (public):');
    res.rows.forEach(r => console.log(`  - ${r.table_name}`));

  } catch (err) {
    console.error('❌ Erreur lors de la migration SQL:', err.message);
  } finally {
    await client.end();
  }
}

runMigration();
