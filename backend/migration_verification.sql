-- MIGRACIÓN: Afegir camps de verificació d'email
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMP;

-- Actualització: Els usuaris existents es marquen com a verificats per no bloquejar-los
UPDATE users SET email_verified = TRUE WHERE email_verified IS FALSE;
