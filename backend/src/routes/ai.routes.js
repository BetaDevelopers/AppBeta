const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const ai = require('../controllers/ai.controller');

router.use(verifyToken);
router.post('/improve',         ai.improve);
router.post('/summarize',       ai.summarize);
router.post('/suggest-subject', ai.suggest);

module.exports = router;
