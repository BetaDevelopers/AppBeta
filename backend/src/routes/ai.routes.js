const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.post('/improve', aiController.improve);
router.post('/summarize', aiController.summarize);

module.exports = router;
