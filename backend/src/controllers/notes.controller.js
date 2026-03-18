const pool = require('../config/db');

const getAll = async (req, res) => {
  const { subject_id } = req.query;
  const userId = req.user.id;

  try {
    let query = `
      SELECT n.*, s.name as subject_name, s.color as subject_color
      FROM notes n
      LEFT JOIN subjects s ON n.subject_id = s.id
      WHERE n.user_id = $1
    `;
    const params = [userId];

    if (subject_id) {
      query += ` AND n.subject_id = $2`;
      params.push(subject_id);
    }

    query += ` ORDER BY n.updated_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const getOne = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT n.*, s.name as subject_name, s.color as subject_color
      FROM notes n
      LEFT JOIN subjects s ON n.subject_id = s.id
      WHERE n.id = $1 AND n.user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nota no trobada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const create = async (req, res) => {
  const { title = 'Sense títol', content = '', subject_id = null } = req.body;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'INSERT INTO notes (title, content, subject_id, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, content, subject_id, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const fields = req.body;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No s\'han enviat camps per actualitzar' });
  }

  try {
    // Check ownership
    const check = await pool.query('SELECT id FROM notes WHERE id = $1 AND user_id = $2', [id, userId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Nota no trobada' });
    }

    const setClause = [];
    const values = [];
    let i = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (['title', 'content', 'subject_id', 'ai_processed'].includes(key)) {
        setClause.push(`${key} = $${i}`);
        values.push(value);
        i++;
      }
    }

    values.push(id);
    const query = `UPDATE notes SET ${setClause.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`;
    
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const remove = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Nota no trobada' });
    }
    res.json({ message: 'Nota eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const search = async (req, res) => {
  const { q } = req.query;
  const userId = req.user.id;

  if (!q) return res.json([]);

  try {
    const result = await pool.query(`
      SELECT n.*, s.name as subject_name, s.color as subject_color,
             ts_rank(n.search_vector, websearch_to_tsquery('simple', $2)) as rank
      FROM notes n
      LEFT JOIN subjects s ON n.subject_id = s.id
      WHERE n.user_id = $1
      AND (
        n.search_vector @@ websearch_to_tsquery('simple', $2)
        OR n.title ILIKE $3
        OR n.content ILIKE $3
      )
      ORDER BY rank DESC, n.updated_at DESC
      LIMIT 20
    `, [userId, q, `%${q}%`]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = { getAll, getOne, create, update, remove, search };
