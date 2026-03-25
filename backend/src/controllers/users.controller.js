const pool    = require('../config/db');
const bcrypt  = require('bcryptjs');

// GET /api/users/me
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, plan, ai_uses_this_month, ai_uses_reset_at, created_at
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
// Body (tots opcionals): { email, password, current_password }
const updateMe = async (req, res) => {
  const { email, password, current_password } = req.body;

  if (!email && !password) {
    return res.status(400).json({ error: 'Cal enviar almenys un camp per actualitzar' });
  }

  try {
    // Carreguem l'usuari actual per verificar contrasenya i detectar duplicat d'email
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuari no trobat' });
    }
    const user = userRes.rows[0];

    const fields = [];
    const values = [];
    let i = 1;

    // Canvi d'email
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Format d\'email invàlid' });
      }
      if (email !== user.email) {
        const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (exists.rows.length > 0) {
          return res.status(409).json({ error: 'Email ja en ús' });
        }
      }
      fields.push(`email = $${i++}`);
      values.push(email);
    }

    // Canvi de contrasenya
    if (password) {
      if (password.length < 4) {
        return res.status(400).json({ error: 'La contrasenya ha de tenir mínim 4 caràcters' });
      }
      if (!current_password) {
        return res.status(400).json({ error: 'Cal la contrasenya actual per canviar-la' });
      }
      const isMatch = await bcrypt.compare(current_password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Contrasenya actual incorrecta' });
      }
      const hashed = await bcrypt.hash(password, 10);
      fields.push(`password = $${i++}`);
      values.push(hashed);
    }

    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, email, plan, ai_uses_this_month, ai_uses_reset_at, created_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateMe error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// GET /api/users/me/stats
// Retorna estadístiques d'ús de l'usuari
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
      notes:     parseInt(notesRes.rows[0].total),
      subjects:  parseInt(subjectsRes.rows[0].total),
      ai_usage:  aiLogsRes.rows,
      plan:      userRes.rows[0].plan,
      ai_uses_this_month: userRes.rows[0].ai_uses_this_month,
      ai_uses_reset_at:   userRes.rows[0].ai_uses_reset_at,
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// DELETE /api/users/me
// Elimina el compte (CASCADE s'encarrega de les notes, subjects, logs)
const deleteMe = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Cal confirmar la contrasenya per eliminar el compte' });
  }

  try {
    const userRes = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuari no trobat' });
    }

    const isMatch = await bcrypt.compare(password, userRes.rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Contrasenya incorrecta' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Compte eliminat correctament' });
  } catch (err) {
    console.error('deleteMe error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = { getMe, updateMe, getStats, deleteMe };