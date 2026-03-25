const router = require('express').Router();
const { verifyToken }      = require('../middleware/auth');
const ai                   = require('../controllers/ai.controller');
const { ocrFromImage }     = require('../controllers/ocr.controller');
const {
  mathOCR,
  segmentMathOCR,
  fixMathText,
  analyzeTable,
  extractChartData,
  vectorizeShape,
  interpretDiagram,
  calibrateHandwriting,
  createTableAssist,
} = require('../controllers/math.controller');
const { checkPlanLimits }  = require('../middleware/checkPlanLimits');

router.use(verifyToken);
router.use(checkPlanLimits);

router.post('/improve',           ai.improve);
router.post('/summarize',         ai.summarize);
router.post('/suggest',           ai.suggest);
router.post('/ocr',               ocrFromImage);
router.post('/math-ocr',          mathOCR);
router.post('/math-segment',      segmentMathOCR);
router.post('/math-fix',          fixMathText);
router.post('/table-to-chart',    analyzeTable);
router.post('/chart-to-table',    extractChartData);
router.post('/vectorize',         vectorizeShape);
router.post('/interpret-diagram', interpretDiagram);
router.post('/calibrate',         calibrateHandwriting);
router.post('/table-assist',      createTableAssist);

module.exports = router;