require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { globalLimiter, authLimiter, aiLimiter } = require('./middleware/rateLimiters');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ── Limitador global (primer de tot) ──────────────────────────────────────
app.use(globalLimiter);

// ── Rutes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, require('./routes/auth.routes'));
app.use('/api/users',                 require('./routes/users.routes'));
app.use('/api/subjects',              require('./routes/subjects.routes'));
app.use('/api/notes',                 require('./routes/notes.routes'));
app.use('/api/ai',       aiLimiter,   require('./routes/ai.routes'));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'Beta 3M API', version: '1.0.0' });
});

// Gestió d'errors global
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err.stack);
  res.status(500).json({ error: 'Error intern del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(` Beta 3M API corrent a http://0.0.0.0:${PORT}`);
});
