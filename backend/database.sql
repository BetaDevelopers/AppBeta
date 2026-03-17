-- Crear base de dades (executar a part si cal)
-- CREATE DATABASE beta3m;

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
  id      SERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  color   TEXT DEFAULT '#048A81',
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id            SERIAL PRIMARY KEY,
  title         TEXT DEFAULT 'Sense títol',
  content       TEXT DEFAULT '',
  subject_id    INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  ai_processed  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attachments (
  id      SERIAL PRIMARY KEY,
  note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
  type    TEXT,
  url     TEXT
);
