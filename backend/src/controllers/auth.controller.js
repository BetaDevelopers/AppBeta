const pool = require('../config/db');
const jwt  = require('jsonwebtoken');
const { supabaseAdmin, supabaseClient } = require('../config/supabase');

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = '7d';

if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET no definit a .env');
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function issueToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Crear usuari a Supabase Auth (email confirmat automàticament)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes('already registered') ||
          authError.message?.toLowerCase().includes('already been registered')) {
        return res.status(409).json({ error: 'Email ja registrat' });
      }
      console.error('Supabase register error:', authError.message);
      return res.status(400).json({ error: authError.message });
    }

    const supabaseId = authData.user.id;

    // 2. Crear registre a public.users
    const result = await pool.query(
      `INSERT INTO users (email, supabase_id)
       VALUES ($1, $2)
       RETURNING id, email, plan, ai_uses_this_month, display_name, created_at`,
      [email, supabaseId]
    );

    const user = result.rows[0];
    const token = issueToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('register error:', err.message, '| detail:', err.detail || '', '| code:', err.code || '');
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Verificar credencials amb Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(401).json({ error: 'Credencials incorrectes' });
    }

    const supabaseId = authData.user.id;

    // 2. Obtenir usuari de public.users per supabase_id
    const result = await pool.query(
      `SELECT id, email, plan, ai_uses_this_month, ai_uses_reset_at,
              display_name, avatar_url, created_at
       FROM users
       WHERE supabase_id = $1`,
      [supabaseId]
    );

    if (result.rows.length === 0) {
      // Comprova si l'usuari existeix per email però amb supabase_id null (cas migració)
      const byEmail = await pool.query(
        `SELECT id, email, plan, ai_uses_this_month, display_name, created_at
         FROM users WHERE email = $1`,
        [email]
      );
      if (byEmail.rows.length > 0) {
        // Actualitza supabase_id per vincular el compte existent
        await pool.query('UPDATE users SET supabase_id = $1 WHERE email = $2', [supabaseId, email]);
        const user = byEmail.rows[0];
        return res.json({ token: issueToken(user), user });
      }
      // Usuari nou: crear registre
      const newUser = await pool.query(
        `INSERT INTO users (email, supabase_id)
         VALUES ($1, $2)
         RETURNING id, email, plan, ai_uses_this_month, display_name, created_at`,
        [email, supabaseId]
      );
      const user = newUser.rows[0];
      return res.json({ token: issueToken(user), user });
    }

    const user = result.rows[0];
    const token = issueToken(user);

    // Actualitzar last_seen_at
    pool.query('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [user.id])
      .catch(() => {});

    res.json({ token, user });
  } catch (err) {
    console.error('login error:', err.message, '| detail:', err.detail || '', '| code:', err.code || '');
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    // Sempre retornem OK per no revelar si l'email existeix
    if (error) console.warn('forgotPassword error:', error.message);

    res.json({ message: 'Si l\'email existeix, rebràs un correu per restablir la contrasenya.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = { register, login, forgotPassword };
