const db = require('../config/db');

const getAll = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM subjects WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const create = async (req, res) => {
  const { name, color } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO subjects (name, color, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, color || '#048A81', req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  try {
    const result = await db.query(
      'UPDATE subjects SET name = COALESCE($1, name), color = COALESCE($2, color) WHERE id = $3 AND user_id = $4 RETURNING *',
      [name, color, id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignatura no trobada o no tens permís' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const remove = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM subjects WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignatura no trobada o no tens permís' });
    }
    res.json({ message: 'Assignatura eliminada correctament' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAll,
  create,
  update,
  remove,
};
