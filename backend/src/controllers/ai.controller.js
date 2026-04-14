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
    res.json({ result });
  } catch (err) {
    console.error('improve error:', err.message);
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
    res.json({ result });
  } catch (err) {
    console.error('summarize error:', err.message);
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
    res.json({ subject });
  } catch (err) {
    console.error('suggest error:', err.message);
    res.status(500).json({ error: 'Error al processar amb IA.' });
  }
};

const saveChatMessages = (userId, noteId, userContent, assistantContent, context) => {
  const nid = noteId || null;
  pool.query(
    'INSERT INTO chat_messages (user_id, note_id, role, content, context) VALUES ($1, $2, $3, $4, $5)',
    [userId, nid, 'user', userContent, context || null]
  ).catch(e => console.warn('chat_messages save error:', e.message));
  pool.query(
    'INSERT INTO chat_messages (user_id, note_id, role, content) VALUES ($1, $2, $3, $4)',
    [userId, nid, 'assistant', assistantContent]
  ).catch(e => console.warn('chat_messages save error:', e.message));
};

const chat = async (req, res) => {
  const { messages, context, note_id } = req.body;

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
    // Nota: L'increment d'ús es gestiona per middleware o manualment si cal, 
    // però aquí el traiem per evitar duplicats.

    // Persistir l'últim missatge de l'usuari + l'assistent
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === 'user') {
      saveChatMessages(req.user.id, note_id, lastUserMsg.content, reply, context);
    }

    res.json({ reply });
  } catch (err) {
    console.error('chat error:', err.message);
    res.status(500).json({ error: 'Error intern' });
  }
};

module.exports = { improve, summarize, suggest, chat };
