-- =====================================================
-- BETA 3M — SUPABASE SETUP COMPLET
-- Executa TOT això al SQL Editor de Supabase
-- =====================================================

-- -----------------------------------------------------
-- 1. ELIMINA TAULES I FUNCIONS EXISTENTS
-- -----------------------------------------------------
DROP TABLE IF EXISTS ai_usage_logs   CASCADE;
DROP TABLE IF EXISTS note_versions   CASCADE;
DROP TABLE IF EXISTS attachments     CASCADE;
DROP TABLE IF EXISTS notes           CASCADE;
DROP TABLE IF EXISTS subjects        CASCADE;
DROP TABLE IF EXISTS users           CASCADE;
DROP TABLE IF EXISTS chat_messages   CASCADE;
DROP TABLE IF EXISTS plans           CASCADE;

DROP TRIGGER IF EXISTS trg_update_notes_updated_at ON notes;
DROP TRIGGER IF EXISTS trg_update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS reset_ai_usage_if_needed();

-- -----------------------------------------------------
-- 2. EXTENSIÓ UUID (Supabase ja la té però per si de cas)
-- -----------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- per cerca fuzzy futura

-- -----------------------------------------------------
-- 3. TAULA PLANS (nou — gestió de plans centralitzada)
-- -----------------------------------------------------
CREATE TABLE plans (
  id              TEXT PRIMARY KEY,           -- 'free', 'pro', 'premium'
  name            TEXT NOT NULL,
  ai_uses_limit   INT NOT NULL DEFAULT 0,     -- 0 = il·limitat
  price_eur       DECIMAL(6,2) NOT NULL DEFAULT 0,
  features        JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO plans (id, name, ai_uses_limit, price_eur, features) VALUES
  ('free',    'Free',    0,   0.00, '["notes_il·limitades","assignatures","sync"]'),
  ('pro',     'Pro',     50,  4.99, '["tot_free","ia_50_usos","ocr","math_ocr","historial_versions"]'),
  ('premium', 'Premium', 0,   9.99, '["tot_pro","ia_il·limitada","exportacio_pdf","prioritat_suport"]');

-- -----------------------------------------------------
-- 4. TAULA USERS
-- -----------------------------------------------------
CREATE TABLE users (
  id                   SERIAL PRIMARY KEY,
  email                TEXT UNIQUE NOT NULL,
  password             TEXT NOT NULL,
  plan                 TEXT NOT NULL DEFAULT 'free' REFERENCES plans(id),
  ai_uses_this_month   INT NOT NULL DEFAULT 0,
  ai_uses_reset_at     TIMESTAMP NOT NULL DEFAULT date_trunc('month', NOW() + INTERVAL '1 month'),
  -- Nous camps
  display_name         TEXT,
  avatar_url           TEXT,
  language             TEXT NOT NULL DEFAULT 'ca',   -- 'ca', 'es', 'en'
  theme                TEXT NOT NULL DEFAULT 'dark', -- 'dark', 'light', 'system'
  onboarding_done      BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at         TIMESTAMP,
  deleted_at           TIMESTAMP,                    -- soft delete
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 5. TAULA SUBJECTS
-- -----------------------------------------------------
CREATE TABLE subjects (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#048A81',
  icon       TEXT,                                   -- emoji o nom d'icona
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position   INT NOT NULL DEFAULT 0,                 -- ordre a la sidebar
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 6. TAULA NOTES
-- -----------------------------------------------------
CREATE TABLE notes (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT 'Sense títol',
  content       TEXT NOT NULL DEFAULT '',
  content_plain TEXT NOT NULL DEFAULT '',
  subject_id    INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_processed  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Nous camps
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at    TIMESTAMP,                           -- soft delete
  word_count    INT NOT NULL DEFAULT 0,
  reading_time  INT NOT NULL DEFAULT 0,              -- minuts estimats
  tags          TEXT[] NOT NULL DEFAULT '{}',        -- array de tags
  cover_color   TEXT,                                -- color de portada
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 7. TAULA NOTE_VERSIONS (historial)
-- -----------------------------------------------------
CREATE TABLE note_versions (
  id            SERIAL PRIMARY KEY,
  note_id       INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  content_html  TEXT NOT NULL,
  content_plain TEXT NOT NULL DEFAULT '',
  action        TEXT NOT NULL DEFAULT 'auto', -- 'auto', 'manual', 'ai', 'restore'
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 8. TAULA AI_USAGE_LOGS
-- -----------------------------------------------------
CREATE TABLE ai_usage_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_id     INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,   -- 'improve','summarize','ocr','math-ocr','suggest'...
  tokens_used INT NOT NULL DEFAULT 0,
  cost_eur    DECIMAL(10,6) NOT NULL DEFAULT 0, -- cost calculat
  model       TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  duration_ms INT,                              -- temps de resposta
  success     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 9. TAULA ATTACHMENTS
-- -----------------------------------------------------
CREATE TABLE attachments (
  id           SERIAL PRIMARY KEY,
  note_id      INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'image', -- 'image', 'pdf', 'audio', 'video'
  url          TEXT NOT NULL,
  storage_path TEXT,                          -- path a Supabase Storage
  filename     TEXT,
  size_bytes   INT,
  mime_type    TEXT,
  width        INT,                           -- per imatges
  height       INT,                           -- per imatges
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 10. TAULA CHAT_MESSAGES (nou — xatbot IA)
-- -----------------------------------------------------
CREATE TABLE chat_messages (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_id     INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  subject_id  INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  context     TEXT,                           -- resum del context passat a la IA
  tokens_used INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 11. TRIGGERS updated_at automàtics
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
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger per calcular word_count automàticament
CREATE OR REPLACE FUNCTION calculate_word_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.word_count = array_length(
    string_to_array(trim(regexp_replace(NEW.content_plain, '\s+', ' ', 'g')), ' '),
    1
  );
  NEW.reading_time = GREATEST(1, ROUND(NEW.word_count::numeric / 200));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notes_word_count
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION calculate_word_count();

-- -----------------------------------------------------
-- 12. ÍNDEXOS (rendiment)
-- -----------------------------------------------------

-- FTS — Full Text Search
CREATE INDEX idx_notes_fts
  ON notes USING gin(
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content_plain,''))
  );

-- Notes per usuari
CREATE INDEX idx_notes_user_updated
  ON notes(user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Notes per assignatura
CREATE INDEX idx_notes_subject
  ON notes(subject_id)
  WHERE subject_id IS NOT NULL AND deleted_at IS NULL;

-- Notes fixades
CREATE INDEX idx_notes_pinned
  ON notes(user_id, is_pinned)
  WHERE is_pinned = TRUE;

-- Notes per tags (cerca per array)
CREATE INDEX idx_notes_tags
  ON notes USING gin(tags);

-- Assignatures per usuari
CREATE INDEX idx_subjects_user_id
  ON subjects(user_id);

-- Versions per nota
CREATE INDEX idx_note_versions_note
  ON note_versions(note_id, created_at DESC);

-- Logs IA per usuari
CREATE INDEX idx_ai_logs_user
  ON ai_usage_logs(user_id, created_at DESC);

-- Logs IA per acció
CREATE INDEX idx_ai_logs_action
  ON ai_usage_logs(action, created_at DESC);

-- Chat per usuari
CREATE INDEX idx_chat_user
  ON chat_messages(user_id, created_at DESC);

-- Attachments per nota
CREATE INDEX idx_attachments_note
  ON attachments(note_id);

-- Cerca trigram per títol (cerca parcial ràpida)
CREATE INDEX idx_notes_title_trgm
  ON notes USING gin(title gin_trgm_ops);

-- -----------------------------------------------------
-- 13. ROW LEVEL SECURITY (Supabase)
-- Bloquem accés directe — tot va pel backend (service_role)
-- -----------------------------------------------------
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans          ENABLE ROW LEVEL SECURITY;

-- Políica: només el backend (service_role) pot accedir
-- El service_role bypassa RLS automàticament a Supabase
-- Bloquejem accés anon i authenticated directe
CREATE POLICY "deny_all_users"     ON users          FOR ALL USING (false);
CREATE POLICY "deny_all_subjects"  ON subjects       FOR ALL USING (false);
CREATE POLICY "deny_all_notes"     ON notes          FOR ALL USING (false);
CREATE POLICY "deny_all_versions"  ON note_versions  FOR ALL USING (false);
CREATE POLICY "deny_all_ai_logs"   ON ai_usage_logs  FOR ALL USING (false);
CREATE POLICY "deny_all_attach"    ON attachments    FOR ALL USING (false);
CREATE POLICY "deny_all_chat"      ON chat_messages  FOR ALL USING (false);

-- Plans: lectura pública (no és informació sensible)
CREATE POLICY "plans_public_read"  ON plans FOR SELECT USING (true);

-- -----------------------------------------------------
-- 14. DADES DE DEMO
-- -----------------------------------------------------
INSERT INTO users (email, password, plan, display_name, onboarding_done)
VALUES (
  'demo@beta3m.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'pro',
  'Usuari Demo',
  TRUE
);

INSERT INTO subjects (name, color, icon, user_id, position) VALUES
  ('General',      '#048A81', '📝', 1, 0),
  ('Matemàtiques', '#3B82F6', '📐', 1, 1),
  ('Biologia',     '#10B981', '🌿', 1, 2),
  ('Física',       '#F59E0B', '⚡', 1, 3),
  ('Història',     '#EF4444', '📚', 1, 4);

INSERT INTO notes (title, content, content_plain, user_id, subject_id) VALUES
(
  'Benvingut a Beta 3M',
  '<h1>Benvingut a Beta 3M</h1><p>Aquesta és la teva primera nota. Pots editar-la, millorar-la amb IA o escanejar contingut amb la càmera.</p>',
  'Benvingut a Beta 3M Aquesta és la teva primera nota.',
  1, 1
),
(
  'Fotosíntesi',
  '<h1>Fotosíntesi</h1><p>Procés pel qual les plantes transformen la llum solar en energia química.</p><h2>Elements necessaris</h2><ul><li>Llum solar</li><li>Aigua (H₂O)</li><li>CO₂</li></ul>',
  'Fotosíntesi Procés pel qual les plantes transformen la llum solar en energia química.',
  1, 3
);

-- -----------------------------------------------------
-- 15. VERIFICACIÓ FINAL
-- -----------------------------------------------------
SELECT
  t.table_name,
  (SELECT count(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name
   AND c.table_schema = 'public') AS columnes,
  (SELECT count(*) FROM information_schema.table_constraints tc
   WHERE tc.table_name = t.table_name
   AND tc.constraint_type = 'INDEX') AS indexos
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;