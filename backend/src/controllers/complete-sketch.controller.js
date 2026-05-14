'use strict';
const openaiService = require('../services/openai.service');

const completeSketch = async (req, res) => {
  const { partialPath } = req.body;
  if (!partialPath) {
    return res.status(400).json({ error: 'partialPath requerido' });
  }
  try {
    const answer = await openaiService.completeSketchPath(partialPath);
    res.json({ completionPath: answer });
  } catch (err) {
    console.error('complete-sketch error:', err.message);
    res.status(500).json({ error: 'Error intern' });
  }
};

module.exports = { completeSketch };
