const openaiService = require('../services/openai.service');

const improve = async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'El text no pot estar buit' });
  }

  try {
    const result = await openaiService.improveText(text);
    res.json({ result });
  } catch (error) {
    console.error('Error OpenAI improve:', error);
    res.status(500).json({ error: 'Error al processar amb IA' });
  }
};

const summarize = async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'El text no pot estar buit' });
  }

  try {
    const result = await openaiService.summarizeText(text);
    res.json({ result });
  } catch (error) {
    console.error('Error OpenAI summarize:', error);
    res.status(500).json({ error: 'Error al processar amb IA' });
  }
};

module.exports = {
  improve,
  summarize,
};
