const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DB_PASSWORD) {
  console.error('❌ FATAL: DB_PASSWORD no definit al .env');
  process.exit(1);
}

const pool = new Pool({
  host: 'db.umalncxibvjoqmaklfsg.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
pool.on('error', (err) => {
  console.error('Error inesperat al pool PostgreSQL:', err);
});

pool.query('SELECT NOW()', (err) => {
  if (err) console.error('❌ No es pot connectar a Supabase:', err.message);
  else     console.log('✅ Supabase connectat correctament');
});

module.exports = pool;