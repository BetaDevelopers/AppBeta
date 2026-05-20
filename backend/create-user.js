const { supabaseAdmin } = require('./src/config/supabase');
const { Pool } = require('pg');
require('dotenv').config();

const EMAIL = 'admin@g.com';
const PASSWORD = 'admin1234';
const DISPLAY_NAME = 'Admin';
const PLAN = 'pro';

async function main() {
  // 1. Crear usuari a Supabase Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });

  if (error) {
    console.error('❌ Error Supabase Auth:', error.message);
    process.exit(1);
  }

  const supabaseId = data.user.id;
  console.log('✅ Supabase Auth creat:', supabaseId);

  // 2. Inserir a public.users
  const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: { rejectUnauthorized: false },
  });

  await pool.query(
    `INSERT INTO users (email, supabase_id, plan, display_name, onboarding_done, email_verified)
     VALUES ($1, $2, $3, $4, TRUE, TRUE)
     ON CONFLICT (email) DO UPDATE SET supabase_id = $2, plan = $3`,
    [EMAIL, supabaseId, PLAN, DISPLAY_NAME]
  );

  await pool.end();
  console.log(`✅ Usuari creat: ${EMAIL} / ${PASSWORD} (pla: ${PLAN})`);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
