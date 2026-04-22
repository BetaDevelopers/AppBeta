const pool = require('../config/db');

const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM subjects WHERE user_id = $1 ORDER BY position ASC, created_at ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getAll subjects error:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const create = async (req, res) => {
  const { name, color = '#048A81', icon = null } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El nom de l\'assignatura és requerit' });
  }

  try {
    // Assign next position
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM subjects WHERE user_id = $1',
      [req.user.id]
    );
    const position = posResult.rows[0].next_pos;

    const result = await pool.query(
      'INSERT INTO subjects (name, color, icon, user_id, position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, color, icon, req.user.id, position]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('create subject error:', err.message, err.detail || '');
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { name, color, icon } = req.body;

  try {
    const checkResult = await pool.query(
      'SELECT * FROM subjects WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignatura no trobada' });
    }

    const result = await pool.query(
      `UPDATE subjects
       SET name  = COALESCE($1, name),
           color = COALESCE($2, color),
           icon  = $3
       WHERE id = $4
       RETURNING *`,
      [name, color, icon ?? null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('update subject error:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const remove = async (req, res) => {
  const { id } = req.params;

  try {
    const checkResult = await pool.query(
      'SELECT * FROM subjects WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignatura no trobada' });
    }

    await pool.query('DELETE FROM subjects WHERE id = $1', [id]);
    res.json({ message: 'Assignatura eliminada' });
  } catch (err) {
    console.error('delete subject error:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// PUT /subjects/reorder  body: { order: [id1, id2, ...] }
const reorder = async (req, res) => {
  const { order } = req.body;

  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: 'Input invàlid' });
  }

  try {
    // Verify all ids belong to this user
    const check = await pool.query(
      'SELECT id FROM subjects WHERE user_id = $1',
      [req.user.id]
    );
    const userIds = new Set(check.rows.map(r => r.id));
    if (!order.every(id => userIds.has(id))) {
      return res.status(403).json({ error: 'Accés denegat' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < order.length; i++) {
        await client.query(
          'UPDATE subjects SET position = $1 WHERE id = $2',
          [i, order[i]]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('reorder subjects error:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = { getAll, create, update, remove, reorder };
