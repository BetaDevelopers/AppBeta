-- =====================================================
-- BETA 3M — MIGRATION FIX (aplica sobre BD existent)
-- Executa això al SQL Editor de Supabase si la BD ja existeix
-- =====================================================

-- 1. Afegir columna supabase_id si no existeix
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS supabase_id UUID UNIQUE;

-- 2. Fer password nullable (el sistema usa Supabase Auth)
ALTER TABLE users
  ALTER COLUMN password DROP NOT NULL;

-- 3. Índex per supabase_id (lookup ràpid al login)
CREATE INDEX IF NOT EXISTS idx_users_supabase_id
  ON users(supabase_id)
  WHERE supabase_id IS NOT NULL;

-- 4. Millorar el trigger de word_count (evitar errors 500 per NULLs)
CREATE OR REPLACE FUNCTION calculate_word_count()
RETURNS TRIGGER AS $$
DECLARE
  plain TEXT;
BEGIN
  plain := COALESCE(NEW.content_plain, '');
  IF plain = '' OR trim(plain) = '' THEN
    NEW.word_count := 0;
    NEW.reading_time := 1;
  ELSE
    NEW.word_count := array_length(
      string_to_array(trim(regexp_replace(plain, '\s+', ' ', 'g')), ' '),
      1
    );
    NEW.word_count := COALESCE(NEW.word_count, 0);
    NEW.reading_time := GREATEST(1, ROUND(NEW.word_count::numeric / 200));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Verificació de columnes a la taula 'users'
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'public'
ORDER BY ordinal_position;
