const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'beta3m',
  password: process.env.DB_PASSWORD || '',
  port:     parseInt(process.env.DB_PORT || '5432'),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Error inesperat a pool PostgreSQL:', err);
});

// Test connexió en arrencar
pool.query('SELECT NOW()', (err) => {
  if (err) console.error('❌ No es pot connectar a PostgreSQL:', err.message);
  else     console.log('✅ PostgreSQL connectat correctament');
});

module.exports = pool;
