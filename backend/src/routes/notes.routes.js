const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const notes = require('../controllers/notes.controller');
const { validateBody, validateId } = require('../middleware/validate');
const { searchLimiter } = require('../middleware/rateLimiters');

const noteBodyRules = {
  title:      { type: 'string',  maxLength: 500 },
  content:    { type: 'string',  maxLength: 500000 },
  subject_id: { type: 'integer' },
};

router.use(verifyToken);
router.get('/search',       searchLimiter, notes.search);
router.get('/trash',        notes.getTrash);
router.get('/',             notes.getAll);
router.get('/:id',          validateId, notes.getOne);
router.get('/:id/versions', validateId, notes.getVersions);
router.post('/',            validateBody(noteBodyRules), notes.create);
router.put('/:id/restore',  validateId, notes.restore);
router.put('/:id',          validateId, validateBody(noteBodyRules), notes.update);
router.delete('/:id',       validateId, notes.remove);

module.exports = router;
