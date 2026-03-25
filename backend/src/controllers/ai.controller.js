const openaiService = require('../services/openai.service');
const pool = require('../config/db');

const incrementAiUsage = (userId) => {
  pool.query(
    'UPDATE users SET ai_uses_this_month = ai_uses_this_month + 1 WHERE id = $1',
    [userId]
  ).catch(e => console.warn('AI counter error:', e.message));
};

const improve = async (req, res) => {
  const { text } = req.body;

  if (!text || text.length <= 10) {
    return res.status(400).json({ error: 'Text massa curt o inexistent' });
  }

  try {
    const result = await openaiService.improveText(text);
    incrementAiUsage(req.user.id);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al processar amb IA. Comprova la clau API.' });
  }
};

const summarize = async (req, res) => {
  const { text } = req.body;

  if (!text || text.length <= 10) {
    return res.status(400).json({ error: 'Text massa curt o inexistent' });
  }

  try {
    const result = await openaiService.summarizeText(text);
    incrementAiUsage(req.user.id);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al processar amb IA. Comprova la clau API.' });
  }
};

const suggest = async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text no proporcionat' });
  }

  try {
    const subject = await openaiService.suggestSubject(text);
    incrementAiUsage(req.user.id);
    res.json({ subject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al processar amb IA.' });
  }
};

module.exports = { improve, summarize, suggest };
