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

async function main() {
  try {
    // 1. Check users count
    const u = await pool.query(`SELECT id, email, plan FROM users LIMIT 5`);
    console.log('=== USERS ===');
    u.rows.forEach(r => console.log(`  id:${r.id} email:${r.email} plan:${r.plan}`));

    if (u.rows.length === 0) {
      console.log('  NO USERS! This will cause 500 on create note.');
      return;
    }

    const testUserId = u.rows[0].id;
    console.log(`\nTesting with user_id: ${testUserId}`);

    // 2. Try to create a note just like the controller does
    const title = 'Test Note';
    const content = '<p>Test</p>';
    const contentPlain = 'Test';
    const subject_id = null;

    const result = await pool.query(
      'INSERT INTO notes (title, content, content_plain, subject_id, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, content, contentPlain, subject_id, testUserId]
    );
    console.log('\n✅ Note created successfully!', result.rows[0].id);

    // 3. Clean up — delete the test note
    await pool.query('DELETE FROM notes WHERE id = $1', [result.rows[0].id]);
    console.log('✅ Test note deleted.');

    // 4. Check note_versions table
    const nv = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'note_versions' AND table_schema = 'public'
    `);
    console.log('\n=== NOTE_VERSIONS COLUMNS ===');
    nv.rows.forEach(r => console.log('  ', r.column_name));

  } catch (e) {
    console.error('\n❌ ERROR:', e.message);
    console.error('   Detail:', e.detail || 'none');
    console.error('   Code:', e.code || 'none');
    console.error('   Constraint:', e.constraint || 'none');
  } finally {
    await pool.end();
  }
}

main();
