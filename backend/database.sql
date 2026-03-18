-- =========================
-- RESET (solo desarrollo)
-- =========================
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- SUBJECTS
-- =========================
CREATE TABLE subjects (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  color        TEXT DEFAULT '#048A81',
  user_id      INTEGER NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_subject_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- =========================
-- NOTES
-- =========================
CREATE TABLE notes (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL DEFAULT 'Sense títol',
  content        TEXT NOT NULL DEFAULT '',
  subject_id     INTEGER,
  user_id        INTEGER NOT NULL,
  ai_processed   BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_note_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_note_subject
    FOREIGN KEY (subject_id)
    REFERENCES subjects(id)
    ON DELETE SET NULL
);

-- =========================
-- ATTACHMENTS (OCR / IMAGES)
-- =========================
CREATE TABLE attachments (
  id           SERIAL PRIMARY KEY,
  note_id      INTEGER NOT NULL,
  type         TEXT NOT NULL DEFAULT 'image',
  url          TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_attachment_note
    FOREIGN KEY (note_id)
    REFERENCES notes(id)
    ON DELETE CASCADE
);

-- =========================
-- TRIGGER updated_at
-- =========================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- =========================
-- FULL TEXT SEARCH (nivel PRO)
-- =========================
ALTER TABLE notes ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('simple', coalesce(NEW.title,'') || ' ' || coalesce(NEW.content,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_search_vector
BEFORE INSERT OR UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_search_vector();

-- Índex GIN para búsquedas rápidas
CREATE INDEX idx_notes_search ON notes USING GIN(search_vector);

-- =========================
-- INDEXES (rendimiento)
-- =========================
CREATE INDEX idx_notes_user_id      ON notes(user_id);
CREATE INDEX idx_notes_subject_id   ON notes(subject_id);
CREATE INDEX idx_subjects_user_id   ON subjects(user_id);

-- =========================
-- DATA DEMO
-- =========================
INSERT INTO users (email, password)
VALUES (
  'demo@beta3m.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.'
);

-- Crear subject demo
INSERT INTO subjects (name, user_id)
VALUES ('General', 1);

-- Crear nota demo
INSERT INTO notes (title, content, user_id, subject_id)
VALUES (
  'Primera nota',
  'Això és una nota de prova amb cerca i IA',
  1,
  1
);


