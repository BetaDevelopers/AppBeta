const router = require('express').Router();
const { verifyToken }      = require('../middleware/auth');
const ai                   = require('../controllers/ai.controller');
const { ocrFromImage }     = require('../controllers/ocr.controller');
const { askObject }        = require('../controllers/ask-object.controller');
const { completeSketch }   = require('../controllers/complete-sketch.controller');
const {
  mathOCR,
  segmentMathOCR,
  fixMathText,
  mathSolve,
  analyzeTable,
  extractChartData,
  vectorizeShape,
  interpretDiagram,
  calibrateHandwriting,
  createTableAssist,
} = require('../controllers/math.controller');
const { checkPlanLimits }  = require('../middleware/checkPlanLimits');
const { aiLimiter }        = require('../middleware/rateLimiters');
const { validateBody }     = require('../middleware/validate');

const TEXT_RULE      = { type: 'string', required: true, maxLength: 50000 };
const IMAGE_B64_RULE = { type: 'string', required: true, maxLength: 7000000 };

router.use(verifyToken);

// OCR is exempt from plan limits — auth is still required
router.post('/ocr',
  validateBody({ image: IMAGE_B64_RULE, mode: { type: 'string', maxLength: 20 } }),
  ocrFromImage
);

router.use(checkPlanLimits);

router.post('/chat',
  validateBody({
    messages: { type: 'array',  required: true },
    context:  { type: 'string', maxLength: 50000 },
  }),
  ai.chat
);
router.post('/improve',    validateBody({ text: TEXT_RULE }), ai.improve);
router.post('/summarize',  validateBody({ text: TEXT_RULE }), ai.summarize);
router.post('/suggest',    validateBody({ text: TEXT_RULE }), ai.suggest);

router.post('/math-ocr',
  validateBody({
    imageBase64: { type: 'string', maxLength: 7000000 },
    strokes:     { type: 'array' },
  }),
  mathOCR
);
router.post('/math-segment',
  validateBody({ imageBase64: IMAGE_B64_RULE }),
  segmentMathOCR
);
router.post('/math-fix',
  validateBody({
    text: TEXT_RULE,
    mode: { type: 'string', required: false, maxLength: 50 },
  }),
  fixMathText
);
router.post('/math-solve',
  validateBody({ latex: { type: 'string', required: true, maxLength: 5000 } }),
  mathSolve
);
router.post('/table-to-chart',
  validateBody({ tableMarkdown: { type: 'string', required: true, maxLength: 50000 } }),
  analyzeTable
);
router.post('/chart-to-table',
  validateBody({ imageBase64: IMAGE_B64_RULE }),
  extractChartData
);
router.post('/vectorize',
  validateBody({ points: { type: 'array', required: true } }),
  vectorizeShape
);
router.post('/interpret-diagram',
  validateBody({
    strokes: { type: 'array',  required: true },
    context: { type: 'string', maxLength: 50000 },
  }),
  interpretDiagram
);
router.post('/calibrate',
  validateBody({ sampleStrokes: { type: 'array', required: true } }),
  calibrateHandwriting
);
router.post('/table-assist',
  validateBody({ instruction: { type: 'string', required: true, maxLength: 50000 } }),
  createTableAssist
);

router.post('/ask-object',
  aiLimiter,
  validateBody({
    objectData:  { type: 'string', maxLength: 5000 },
    objectType:  { type: 'string', required: true, maxLength: 50 },
    noteContext:  { type: 'string', maxLength: 1000 },
  }),
  askObject
);

router.post('/complete-sketch',
  verifyToken,
  aiLimiter,
  validateBody({ partialPath: { type: 'string', required: true, maxLength: 2000 } }),
  completeSketch
);

module.exports = router;