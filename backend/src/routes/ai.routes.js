const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const ai = require('../controllers/ai.controller');
const { ocrFromImage } = require('../controllers/ocr.controller');
const { checkPlanLimits } = require('../middleware/checkPlanLimits');

router.use(verifyToken);
router.use(checkPlanLimits);

router.post('/improve',         ai.improve);
router.post('/summarize',       ai.summarize);
router.post('/ocr',             ocrFromImage);   // ← NOU

module.exports = router;
