-- =====================================================
-- BETA 3M — RESET COMPLET + CREACIÓ DB
-- Executa TOT això de cop al Query Tool de pgAdmin
-- =====================================================

-- -----------------------------------------------------
-- 1. ELIMINA TOTES LES TAULES (ordre correcte per FK)
-- -----------------------------------------------------
DROP TABLE IF EXISTS ai_usage_logs   CASCADE;
DROP TABLE IF EXISTS note_versions   CASCADE;
DROP TABLE IF EXISTS attachments     CASCADE;
DROP TABLE IF EXISTS notes           CASCADE;
DROP TABLE IF EXISTS subjects        CASCADE;
DROP TABLE IF EXISTS users           CASCADE;

-- Elimina el trigger i la funció si existeixen
DROP TRIGGER IF EXISTS trg_update_notes_updated_at ON notes;
DROP FUNCTION IF EXISTS update_updated_at();

-- -----------------------------------------------------
-- 2. TAULA USERS
-- -----------------------------------------------------
CREATE TABLE users (
  id                   SERIAL PRIMARY KEY,
  email                TEXT UNIQUE NOT NULL,
  password             TEXT NOT NULL,
  plan                 TEXT NOT NULL DEFAULT 'free',
  ai_uses_this_month   INT NOT NULL DEFAULT 0,
  ai_uses_reset_at     TIMESTAMP NOT NULL DEFAULT date_trunc('month', NOW() + INTERVAL '1 month'),
  created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 3. TAULA SUBJECTS
-- -----------------------------------------------------
CREATE TABLE subjects (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#048A81',
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 4. TAULA NOTES
-- -----------------------------------------------------
CREATE TABLE notes (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT 'Sense títol',
  content       TEXT NOT NULL DEFAULT '',
  content_plain TEXT NOT NULL DEFAULT '',
  subject_id    INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_processed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 5. TAULA NOTE_VERSIONS (historial)
-- -----------------------------------------------------
CREATE TABLE note_versions (
  id            SERIAL PRIMARY KEY,
  note_id       INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  content_html  TEXT NOT NULL,
  content_plain TEXT NOT NULL DEFAULT '',
  action        TEXT NOT NULL DEFAULT 'auto',
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 6. TAULA AI_USAGE_LOGS
-- -----------------------------------------------------
CREATE TABLE ai_usage_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_id     INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  tokens_used INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 7. TAULA ATTACHMENTS
-- -----------------------------------------------------
CREATE TABLE attachments (
  id         SERIAL PRIMARY KEY,
  note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'image',
  url        TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 8. TRIGGER updated_at automàtic per notes
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- 9. ÍNDEXOS (rendiment)
-- -----------------------------------------------------

-- Cerca de text complet (FTS) — 'simple' funciona per català, castellà i anglès
CREATE INDEX idx_notes_fts
ON notes USING gin(
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content_plain, ''))
);

-- Notes per usuari ordenades per data (query més freqüent)
CREATE INDEX idx_notes_user_updated
ON notes(user_id, updated_at DESC);

-- Notes per assignatura (amb filtre IS NOT NULL per optimitzar)
CREATE INDEX idx_notes_subject
ON notes(subject_id) WHERE subject_id IS NOT NULL;

-- Assignatures per usuari
CREATE INDEX idx_subjects_user_id
ON subjects(user_id);

-- Versions d'una nota per data
CREATE INDEX idx_note_versions_note
ON note_versions(note_id, created_at DESC);

-- Logs d'IA per usuari i data
CREATE INDEX idx_ai_logs_user
ON ai_usage_logs(user_id, created_at DESC);

-- -----------------------------------------------------
-- 10. DADES DE DEMO
-- -----------------------------------------------------

-- Usuari demo (password: "password")
INSERT INTO users (email, password, plan)
VALUES (
  'demo@beta3m.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'pro'
);

-- Assignatures de demo
INSERT INTO subjects (name, color, user_id) VALUES ('General',      '#048A81', 1);
INSERT INTO subjects (name, color, user_id) VALUES ('Matemàtiques', '#3B82F6', 1);
INSERT INTO subjects (name, color, user_id) VALUES ('Biologia',     '#10B981', 1);

-- Notes de demo
INSERT INTO notes (title, content, content_plain, user_id, subject_id)
VALUES (
  'Benvingut a Beta 3M',
  '<h1>Benvingut a Beta 3M</h1><p>Aquesta és la teva primera nota. Pots editar-la, millorar-la amb IA o escanejar contingut amb la càmera.</p>',
  'Benvingut a Beta 3M Aquesta és la teva primera nota. Pots editar-la, millorar-la amb IA o escanejar contingut amb la càmera.',
  1,
  1
);

INSERT INTO notes (title, content, content_plain, user_id, subject_id)
VALUES (
  'Fotosíntesi',
  '<h1>Fotosíntesi</h1><p>Procés pel qual les plantes transformen la llum solar en energia química.</p><h2>Elements necessaris</h2><ul><li>Llum solar</li><li>Aigua (H₂O)</li><li>CO₂</li></ul>',
  'Fotosíntesi Procés pel qual les plantes transformen la llum solar en energia química. Elements necessaris Llum solar Aigua CO2',
  1,
  3
);

-- -----------------------------------------------------
-- 11. VERIFICACIÓ FINAL
-- -----------------------------------------------------
SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name
   AND c.table_schema = 'public') AS num_columnes
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
