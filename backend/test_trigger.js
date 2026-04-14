require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.hcxhgukqekyekybmbzgi',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
});

async function testTrigger() {
  try {
    console.log('Testing trigger with empty content...');
    // We need a valid user_id
    const u = await pool.query('SELECT id FROM users LIMIT 1');
    if (u.rows.length === 0) throw new Error('No users found');
    const userId = u.rows[0].id;

    // Test with empty content
    try {
      const res = await pool.query(
        'INSERT INTO notes (title, content, content_plain, user_id) VALUES ($1, $2, $3, $4) RETURNING id, word_count, reading_time',
        ['Trigger Test', '', '', userId]
      );
      console.log('✅ Empty content worked:', res.rows[0]);
      await pool.query('DELETE FROM notes WHERE id = $1', [res.rows[0].id]);
    } catch (e) {
      console.error('❌ Empty content failed:', e.message);
    }

    // Test with NULL content_plain (though controller shouldn't send it, but let's see if trigger breaks)
    try {
      const res = await pool.query(
        'INSERT INTO notes (title, content, content_plain, user_id) VALUES ($1, $2, $3, $4) RETURNING id, word_count, reading_time',
        ['Trigger Test NULL', '', null, userId]
      );
      console.log('✅ NULL content_plain worked:', res.rows[0]);
      await pool.query('DELETE FROM notes WHERE id = $1', [res.rows[0].id]);
    } catch (e) {
      console.error('❌ NULL content_plain failed:', e.message);
    }

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await pool.end();
  }
}

testTrigger();
