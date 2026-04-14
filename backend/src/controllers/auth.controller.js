const pool = require('../config/db');
const jwt  = require('jsonwebtoken');
const crypto = require('crypto');
const { supabaseAdmin, supabaseClient } = require('../config/supabase');

// Helper per enviar emails amb Resend via fetch
async function sendVerificationEmail(email, token) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FRONTEND_URL   = process.env.FRONTEND_URL || 'http://localhost:5173';
  const API_URL        = process.env.API_URL || 'http://localhost:3000';

  if (!RESEND_API_KEY) {
    console.warn('[AUTH] No s\'ha configurat RESEND_API_KEY. No es pot enviar l\'email.');
    return;
  }

  const verifyUrl = `${API_URL}/api/auth/verify?token=${token}`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Beta3M <noreply@beta3m.com>', // Hauria de ser un domini verificat a Resend
        to: email,
        subject: 'Confirma la teva conta de Beta3M',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #3b82f6;">Benvingut a Beta3M</h1>
            <p>Gràcies per registrar-te. Per favor, confirma el teu correu electrònic fent clic al botó de sota:</p>
            <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Confirmar compte</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Aquest enllaç caduca en 24 hores.</p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error enviant email Resend:', error);
    }
  } catch (err) {
    console.error('Error de xarxa enviant email Resend:', err.message);
  }
}

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
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // 2. Crear registre a public.users
    const result = await pool.query(
      `INSERT INTO users (email, supabase_id, email_verified, email_verify_token, email_verify_expires)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, plan, display_name, created_at`,
      [email, supabaseId, false, verifyToken, verifyExpires]
    );

    const user = result.rows[0];
    
    // 3. Enviar correu de verificació
    await sendVerificationEmail(email, verifyToken);

    // [MOD] S'emet token immediatament per opció "no implementada/forçada" encara
    const token = issueToken(user);
    res.status(201).json({ 
      message: 'Registre correcte. S\'ha enviat un correu de verificació, però ja pots entrar.',
      token,
      user 
    });
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
              display_name, avatar_url, created_at, email_verified
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

    // [MOD] Verificació desactivada temporalment (deixat el codi a sota però no bloqueja)
    /*
    if (!user.email_verified) {
      return res.status(403).json({ 
        error: 'Confirma la teva conta abans d\'entrar. Revisa la teva bústia d\'entrada.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }
    */

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

// ── GET /api/auth/verify?token=xxx ──────────────────────────────────────────
const verify = async (req, res) => {
  const { token } = req.query;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!token) return res.status(400).send('Token requerit');

  try {
    const result = await pool.query(
      `UPDATE users
       SET email_verified = TRUE,
           email_verify_token = NULL,
           email_verify_expires = NULL
       WHERE email_verify_token = $1
         AND email_verify_expires > NOW()
       RETURNING id`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send('Token invàlid o expirat');
    }

    res.redirect(`${FRONTEND_URL}/login?verified=true`);
  } catch (err) {
    console.error('verify error:', err.message);
    res.status(500).send('Error del servidor');
  }
};

// ── POST /api/auth/resend-verify ────────────────────────────────────────────
const resendVerification = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'Email requerit' });

  try {
    const result = await pool.query(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ message: 'Si el compte existeix i no està verificat, rebràs un nou correu.' });
    }

    const user = result.rows[0];
    if (user.email_verified) {
      return res.status(400).json({ error: 'Aquest compte ja ha estat verificat.' });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE users SET
         email_verify_token = $1,
         email_verify_expires = $2
       WHERE id = $3`,
      [newToken, newExpires, user.id]
    );

    await sendVerificationEmail(email, newToken);

    res.json({ message: 'S\'ha enviat un nou correu de verificació.' });
  } catch (err) {
    console.error('resendVerification error:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = { register, login, forgotPassword, verify, resendVerification };
