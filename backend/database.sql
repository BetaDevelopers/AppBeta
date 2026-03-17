-- Esborra i recrea (útil en desenvolupament)
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Usuaris
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignatures
CREATE TABLE subjects (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#048A81',
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notes
CREATE TABLE notes (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL DEFAULT 'Sense títol',
  content      TEXT NOT NULL DEFAULT '',
  subject_id   INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_processed BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Funció auto-update de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Adjunts (imatges OCR)
CREATE TABLE attachments (
  id         SERIAL PRIMARY KEY,
  note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'image',
  url        TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índexos per rendiment
CREATE INDEX idx_notes_user_id      ON notes(user_id);
CREATE INDEX idx_notes_subject_id   ON notes(subject_id);
CREATE INDEX idx_subjects_user_id   ON subjects(user_id);

-- Dades de prova
INSERT INTO users (email, password) VALUES
  ('demo@beta3m.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
-- password: "password"
