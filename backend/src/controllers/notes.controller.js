const pool = require('../config/db');

const stripHtml = (html) =>
  (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const getAll = async (req, res) => {
  const { subject_id } = req.query;
  const userId = req.user.id;
  try {
    let query = `
      SELECT n.*, s.name as subject_name, s.color as subject_color
      FROM notes n
      LEFT JOIN subjects s ON n.subject_id = s.id
      WHERE n.user_id = $1
        AND n.deleted_at IS NULL
        AND n.is_archived = FALSE
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
    console.error('getAll notes error:', err.message, err.detail || '');
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

  // subject_id ha de ser null o un enter positiu
  const safeSubjectId = subject_id && Number.isInteger(subject_id) && subject_id > 0
    ? subject_id
    : null;

  const contentPlain = stripHtml(content);

  try {
    const result = await pool.query(
      'INSERT INTO notes (title, content, content_plain, subject_id, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, content, contentPlain, safeSubjectId, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('create note error:', err.message, err.detail || '');
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, subject_id, ai_processed } = req.body;

    // Verifica propietat i obté contingut actual per al historial
    const check = await pool.query(
      'SELECT id, content, content_plain FROM notes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Nota no trobada' });
    }

    // Construeix query dinàmica — només actualitza els camps que venen al body
    const fields = [];
    const values = [];
    let i = 1;

    if (title !== undefined) {
      fields.push(`title = $${i++}`);
      values.push(title);
    }
    if (content !== undefined) {
      fields.push(`content = $${i++}`);
      values.push(content);
      // SEMPRE actualitza content_plain quan arriba content
      fields.push(`content_plain = $${i++}`);
      values.push(stripHtml(content));
    }
    if (subject_id !== undefined) {
      fields.push(`subject_id = $${i++}`);
      values.push(subject_id === null ? null : parseInt(subject_id));
    }
    if (ai_processed !== undefined) {
      fields.push(`ai_processed = $${i++}`);
      values.push(ai_processed);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Cap camp per actualitzar' });
    }

    // Desar versió anterior abans d'actualitzar (només si ve contingut nou)
    if (content !== undefined) {
      const prev = check.rows[0];
      pool.query(
        'INSERT INTO note_versions (note_id, content_html, content_plain, action, created_by) VALUES ($1, $2, $3, $4, $5)',
        [id, prev.content || '', prev.content_plain || '', 'update', req.user.id]
      ).catch(e => console.warn('note_versions insert error:', e.message));
    }

    // updated_at el gestiona el trigger automàticament, NO cal posar-ho aquí
    values.push(id);
    const result = await pool.query(
      `UPDATE notes SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error update note:', err);
    res.status(500).json({ error: 'Error al actualitzar la nota' });
  }
};

const getVersions = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        // Verificar propietat primer
        const check = await pool.query('SELECT id FROM notes WHERE id = $1 AND user_id = $2', [id, userId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Nota no trobada' });

        const result = await pool.query(
            'SELECT * FROM note_versions WHERE note_id = $1 ORDER BY created_at DESC LIMIT 10',
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al recuperar l\'historial' });
    }
};

const remove = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'UPDATE notes SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id',
      [id, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Nota no trobada' });
    }
    res.json({ message: 'Nota eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const getTrash = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT n.*, s.name as subject_name, s.color as subject_color
       FROM notes n
       LEFT JOIN subjects s ON n.subject_id = s.id
       WHERE n.user_id = $1 AND n.deleted_at IS NOT NULL
       ORDER BY n.deleted_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getTrash error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const restore = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'UPDATE notes SET deleted_at = NULL WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL RETURNING id',
      [id, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Nota no trobada a la paperera' });
    }
    res.json({ message: 'Nota restaurada' });
  } catch (err) {
    console.error('restore error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);

    const query = q.trim();

    // Intent 1: Full Text Search amb índex GIN (ràpid)
    try {
      const result = await pool.query(
        `SELECT id, title, content_plain, subject_id, updated_at,
                ts_rank(
                  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content_plain,'')),
                  plainto_tsquery('simple', $1)
                ) AS rank
         FROM notes
         WHERE user_id = $2
           AND deleted_at IS NULL
           AND is_archived = FALSE
           AND to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content_plain,''))
               @@ plainto_tsquery('simple', $1)
         ORDER BY rank DESC, updated_at DESC
         LIMIT 20`,
        [query, req.user.id]
      );
      return res.json(result.rows);
    } catch {
      // Fallback: ILIKE si falla FTS (ex: paraula massa curta)
      const result = await pool.query(
        `SELECT id, title, content_plain, subject_id, updated_at
         FROM notes
         WHERE user_id = $1
           AND deleted_at IS NULL
           AND is_archived = FALSE
           AND (title ILIKE $2 OR content_plain ILIKE $2)
         ORDER BY updated_at DESC
         LIMIT 20`,
        [req.user.id, `%${query}%`]
      );
      return res.json(result.rows);
    }
  } catch (err) {
    console.error('Error search notes:', err);
    res.status(500).json({ error: 'Error en la cerca' });
  }
};

module.exports = { getAll, getOne, create, update, remove, search, getVersions, getTrash, restore };
