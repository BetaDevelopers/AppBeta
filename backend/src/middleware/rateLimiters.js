const rateLimit = require('express-rate-limit');

// En dev els límits es multipliquen x10 per no bloquejar-se
const isDev = process.env.NODE_ENV === 'development';
const M = isDev ? 10 : 1;

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300 * M,
  message: { error: 'Massa peticions. Torna a provar en 15 minuts.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10 * M,
  message: { error: 'Massa intents d\'autenticació. Espera 15 minuts.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20 * M,
  message: { error: 'Massa peticions a la IA. Espera 1 minut.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60 * M,
  message: { error: 'Massa cerques. Espera 1 minut.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { globalLimiter, authLimiter, aiLimiter, searchLimiter };
