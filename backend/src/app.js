require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Massa intents. Torna-ho a provar en 15 minuts.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rutes
app.use('/api/auth',     authLimiter, require('./routes/auth.routes'));
app.use('/api/users',    require('./routes/users.routes'));
app.use('/api/subjects', require('./routes/subjects.routes'));
app.use('/api/notes',    require('./routes/notes.routes'));
app.use('/api/ai',       require('./routes/ai.routes'));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'Beta 3M API', version: '1.0.0' });
});

// Gestió d'errors global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error intern del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Beta 3M API corrent a http://localhost:${PORT}`);
});