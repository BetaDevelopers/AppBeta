require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import rutes
const authRoutes = require('./routes/auth.routes');
const subjectsRoutes = require('./routes/subjects.routes');
const notesRoutes = require('./routes/notes.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Rutes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'Beta 3M API' });
});

// Inici de servidor
app.listen(PORT, () => {
  console.log(`Servidor de Beta 3M corrent a http://localhost:${PORT}`);
});
