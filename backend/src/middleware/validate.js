/**
 * validate.js — Middleware de validació i sanitització d'inputs
 *
 * Exports:
 *   sanitizeString(str, maxLength)  — neteja un string d'entrada
 *   validateBody(rules)             — factory de middleware Express
 *   validateId(req, res, next)      — valida que :id sigui un integer positiu
 */

const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g; // ASCII < 32 excepte \n(\x0A) i \t(\x09)

/**
 * Elimina caràcters de control, fa trim i trunca a maxLength.
 * @param {any}    str
 * @param {number} [maxLength]
 * @returns {string}
 */
function sanitizeString(str, maxLength) {
  if (typeof str !== 'string') return str;
  let clean = str.replace(CONTROL_CHARS, '').trim();
  if (maxLength && clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }
  return clean;
}

/**
 * Retorna un middleware Express que valida req.body segons les regles donades.
 *
 * Regles per camp:
 *   type       : 'string' | 'integer' | 'array'
 *   required   : boolean
 *   minLength  : number  (només string)
 *   maxLength  : number  (string → trunca i sanitiza; array → length)
 *   pattern    : RegExp  (només string, comprova ABANS de truncar)
 *
 * En cas d'error → 400 { error: 'Input invàlid' }
 * Mai s'exposa quin camp ha fallat per evitar enumeration attacks.
 *
 * @param {Object} rules
 * @returns {import('express').RequestHandler}
 */
function validateBody(rules) {
  return (req, res, next) => {
    for (const [field, rule] of Object.entries(rules)) {
      let value = req.body[field];

      // --- required ----------------------------------------------------------
      if (rule.required) {
        const missing =
          value === undefined ||
          value === null ||
          value === '' ||
          (rule.type === 'array' && (!Array.isArray(value) || value.length === 0));
        if (missing) {
          return res.status(400).json({ error: 'Input invàlid' });
        }
      }

      // Si el camp no ve al body i no és required, skip
      if (value === undefined || value === null) continue;

      // --- type check --------------------------------------------------------
      if (rule.type === 'string') {
        if (typeof value !== 'string') {
          return res.status(400).json({ error: 'Input invàlid' });
        }

        // pattern (comprova ABANS de truncar)
        if (rule.pattern && !rule.pattern.test(value)) {
          return res.status(400).json({ error: 'Input invàlid' });
        }

        // sanitize + truncate
        value = sanitizeString(value, rule.maxLength);
        req.body[field] = value;

        // minLength (després de trim)
        if (rule.minLength && value.length < rule.minLength) {
          return res.status(400).json({ error: 'Input invàlid' });
        }

      } else if (rule.type === 'integer') {
        // Accepta number o string numèric; null és vàlid si no és required
        if (value === null) continue;
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed <= 0) {
          return res.status(400).json({ error: 'Input invàlid' });
        }
        req.body[field] = parsed;

      } else if (rule.type === 'array') {
        if (!Array.isArray(value)) {
          return res.status(400).json({ error: 'Input invàlid' });
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          return res.status(400).json({ error: 'Input invàlid' });
        }
      }
    }

    next();
  };
}

/**
 * Valida que req.params.id sigui un integer positiu.
 * Si no → 400 { error: 'ID invàlid' }
 */
function validateId(req, res, next) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'ID invàlid' });
  }
  next();
}

// Patrons reutilitzables
validateBody.EMAIL_PATTERN = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
validateBody.HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

module.exports = { sanitizeString, validateBody, validateId };
