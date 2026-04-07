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

const chat = async (req, res) => {
  const { messages, context } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Cal enviar un historial de missatges' });
  }

  const systemPrompt = [
    'Ets un assistent d\'estudi intel·ligent que ajuda estudiants a entendre els seus apunts.',
    'Respon sempre en la mateixa llengua que l\'estudiant (català, castellà, anglès...).',
    'Sigues concís, clar i pedagògic. Usa markdown per estructurar les respostes llargues.',
    context
      ? `\nTens accés als apunts de l\'estudiant:\n\n${context}`
      : '\nL\'estudiant no té cap nota oberta en aquest moment.',
  ].join('\n');

  try {
    const reply = await openaiService.chatWithHistory(systemPrompt, messages);
    incrementAiUsage(req.user.id);
    res.json({ reply });
  } catch (err) {
    console.error('chat error:', err.message);
    res.status(500).json({ error: 'Error intern' });
  }
};

module.exports = { improve, summarize, suggest, chat };
