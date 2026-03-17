const pool = require('../config/db');

const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM subjects WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const create = async (req, res) => {
  const { name, color = '#048A81' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El nom de l\'assignatura és requerit' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO subjects (name, color, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, color, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;

  try {
    const checkResult = await pool.query('SELECT * FROM subjects WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignatura no trobada' });
    }

    const result = await pool.query(
      'UPDATE subjects SET name = COALESCE($1, name), color = COALESCE($2, color) WHERE id = $3 RETURNING *',
      [name, color, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const remove = async (req, res) => {
  const { id } = req.params;

  try {
    const checkResult = await pool.query('SELECT * FROM subjects WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignatura no trobada' });
    }

    await pool.query('DELETE FROM subjects WHERE id = $1', [id]);
    res.json({ message: 'Assignatura eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = { getAll, create, update, remove };
