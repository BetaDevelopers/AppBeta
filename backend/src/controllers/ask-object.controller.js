'use strict';
const openaiService = require('../services/openai.service');

const askObject = async (req, res) => {
  const { objectData, objectType, noteContext } = req.body;
  if (!objectType) {
    return res.status(400).json({ error: 'objectType requerido' });
  }
  try {
    const answer = await openaiService.askAboutObject(objectData, objectType, noteContext);
    res.json({ answer });
  } catch (err) {
    console.error('ask-object error:', err.message);
    res.status(500).json({ error: 'Error intern' });
  }
};

module.exports = { askObject };
