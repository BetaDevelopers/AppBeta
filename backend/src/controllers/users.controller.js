const pool = require('../config/db');
const { supabaseAdmin, supabaseClient } = require('../config/supabase');

// GET /api/users/me
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, plan, ai_uses_this_month, ai_uses_reset_at,
              display_name, avatar_url, language, theme, onboarding_done,
              last_seen_at, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuari no trobat' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// PUT /api/users/me
// Body (tots opcionals): { email, display_name, password, current_password }
const updateMe = async (req, res) => {
  const { email, display_name, password, current_password } = req.body;

  if (!email && !display_name && !password) {
    return res.status(400).json({ error: 'Cal enviar almenys un camp per actualitzar' });
  }

  try {
    const userRes = await pool.query(
      'SELECT id, email, supabase_id FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuari no trobat' });
    }
    const user = userRes.rows[0];

    const fields = [];
    const values = [];
    let i = 1;

    // Canvi de display_name
    if (display_name !== undefined) {
      fields.push(`display_name = $${i++}`);
      values.push(display_name || null);
    }

    // Canvi d'email
    if (email && email !== user.email) {
      const exists = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, user.id]);
      if (exists.rows.length > 0) {
        return res.status(409).json({ error: 'Email ja en ús' });
      }
      // Actualitzar email a Supabase Auth
      if (user.supabase_id) {
        const { error: sbErr } = await supabaseAdmin.auth.admin.updateUserById(
          user.supabase_id,
          { email, email_confirm: true }
        );
        if (sbErr) {
          console.error('Supabase email update error:', sbErr.message);
          return res.status(400).json({ error: 'No s\'ha pogut actualitzar el email' });
        }
      }
      fields.push(`email = $${i++}`);
      values.push(email);
    }

    // Canvi de contrasenya via Supabase
    if (password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Cal la contrasenya actual per canviar-la' });
      }
      // Verificar contrasenya actual
      const { error: signInErr } = await supabaseClient.auth.signInWithPassword({
        email: user.email,
        password: current_password,
      });
      if (signInErr) {
        return res.status(401).json({ error: 'Contrasenya actual incorrecta' });
      }
      // Actualitzar contrasenya a Supabase
      if (user.supabase_id) {
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(
          user.supabase_id,
          { password }
        );
        if (pwErr) {
          console.error('Supabase password update error:', pwErr.message);
          return res.status(400).json({ error: 'No s\'ha pogut actualitzar la contrasenya' });
        }
      }
      // No guardem la contrasenya a public.users
    }

    if (fields.length === 0) {
      // Només canvi de contrasenya (no hi ha camps a actualitzar a public.users)
      const updated = await pool.query(
        `SELECT id, email, plan, ai_uses_this_month, ai_uses_reset_at,
                display_name, avatar_url, created_at
         FROM users WHERE id = $1`,
        [user.id]
      );
      return res.json(updated.rows[0]);
    }

    values.push(user.id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, email, plan, ai_uses_this_month, ai_uses_reset_at,
                 display_name, avatar_url, created_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateMe error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// GET /api/users/me/stats
const getStats = async (req, res) => {
  const userId = req.user.id;
  try {
    const [notesRes, subjectsRes, aiLogsRes, userRes] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM notes WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) AS total FROM subjects WHERE user_id = $1', [userId]),
      pool.query(
        `SELECT action, COUNT(*) AS total, SUM(tokens_used) AS tokens
         FROM ai_usage_logs
         WHERE user_id = $1
         GROUP BY action
         ORDER BY total DESC`,
        [userId]
      ),
      pool.query(
        'SELECT plan, ai_uses_this_month, ai_uses_reset_at FROM users WHERE id = $1',
        [userId]
      ),
    ]);

    res.json({
      notes:              parseInt(notesRes.rows[0].total),
      subjects:           parseInt(subjectsRes.rows[0].total),
      ai_usage:           aiLogsRes.rows,
      plan:               userRes.rows[0].plan,
      ai_uses_this_month: userRes.rows[0].ai_uses_this_month,
      ai_uses_reset_at:   userRes.rows[0].ai_uses_reset_at,
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// DELETE /api/users/me
const deleteMe = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Cal confirmar la contrasenya per eliminar el compte' });
  }

  try {
    const userRes = await pool.query(
      'SELECT email, supabase_id FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuari no trobat' });
    }
    const { email, supabase_id } = userRes.rows[0];

    // Verificar contrasenya
    const { error: signInErr } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (signInErr) {
      return res.status(401).json({ error: 'Contrasenya incorrecta' });
    }

    // Eliminar de public.users (CASCADE elimina notes, subjects, logs)
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);

    // Eliminar de Supabase Auth
    if (supabase_id) {
      await supabaseAdmin.auth.admin.deleteUser(supabase_id).catch(() => {});
    }

    res.json({ message: 'Compte eliminat correctament' });
  } catch (err) {
    console.error('deleteMe error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = { getMe, updateMe, getStats, deleteMe };
