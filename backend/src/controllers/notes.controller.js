const db = require('../config/db');

const getAll = async (req, res) => {
  const { subject_id } = req.query;
  try {
    let query = `
      SELECT n.* FROM notes n
      JOIN subjects s ON n.subject_id = s.id
      WHERE s.user_id = $1
    `;
    let params = [req.user.id];

    if (subject_id) {
      query += ' AND n.subject_id = $2';
      params.push(subject_id);
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getOne = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT n.* FROM notes n
       JOIN subjects s ON n.subject_id = s.id
       WHERE n.id = $1 AND s.user_id = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nota no trobada o no tens permís' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const create = async (req, res) => {
  const { title, content, subject_id } = req.body;
  try {
    // Verificar que l'assignatura pertany a l'usuari
    const subject = await db.query('SELECT * FROM subjects WHERE id = $1 AND user_id = $2', [subject_id, req.user.id]);
    if (subject.rows.length === 0) {
      return res.status(403).json({ error: 'Assignatura no vàlida o no tens permís' });
    }

    const result = await db.query(
      'INSERT INTO notes (title, content, subject_id) VALUES ($1, $2, $3) RETURNING *',
      [title || 'Sense títol', content || '', subject_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { title, content, subject_id, ai_processed } = req.body;
  try {
    // Primer verificar que la nota pertany a l'usuari
    const noteCheck = await db.query(
      'SELECT n.* FROM notes n JOIN subjects s ON n.subject_id = s.id WHERE n.id = $1 AND s.user_id = $2',
      [id, req.user.id]
    );
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Nota no trobada o no tens permís' });
    }

    // Si es canvia l'assignatura, verificar que la nova també sigui de l'usuari
    if (subject_id && subject_id !== noteCheck.rows[0].subject_id) {
        const subject = await db.query('SELECT * FROM subjects WHERE id = $1 AND user_id = $2', [subject_id, req.user.id]);
        if (subject.rows.length === 0) {
          return res.status(403).json({ error: 'Nova assignatura no vàlida o no tens permís' });
        }
    }

    const result = await db.query(
      `UPDATE notes 
       SET title = COALESCE($1, title), 
           content = COALESCE($2, content), 
           subject_id = COALESCE($3, subject_id),
           ai_processed = COALESCE($4, ai_processed),
           updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [title, content, subject_id, ai_processed, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const remove = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `DELETE FROM notes n
       USING subjects s
       WHERE n.subject_id = s.id AND n.id = $1 AND s.user_id = $2
       RETURNING n.*`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nota no trobada o no tens permís' });
    }
    res.json({ message: 'Nota eliminada correctament' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
};
