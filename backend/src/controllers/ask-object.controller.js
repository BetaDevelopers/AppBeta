'use strict';
const openaiService = require('../services/openai.service');

const askObject = async (req, res) => {
  const { objectData, objectType, noteContext } = req.body;
  if (!objectType) {
    return res.status(400).json({ error: 'objectType requerido' });
  }

  let customPrompt;
  if (objectType === 'equation') {
    customPrompt = `Tengo esta ecuación en LaTeX: ${objectData}.
Si tiene incógnita: resuélvela y da el valor.
Si es una identidad o expresión: simplifícala o evalúala.
Responde en ${(noteContext || '').substring(0, 30) || 'español'}.
Formato: explica en 1 frase y da el resultado en LaTeX entre backticks.`;
  }

  try {
    const answer = await openaiService.askAboutObject(objectData, objectType, noteContext, customPrompt);
    res.json({ answer });
  } catch (err) {
    console.error('ask-object error:', err.message);
    res.status(500).json({ error: 'Error intern' });
  }
};

module.exports = { askObject };
