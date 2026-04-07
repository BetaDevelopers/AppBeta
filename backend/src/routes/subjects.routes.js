const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const subjects = require('../controllers/subjects.controller');
const { validateBody, validateId } = require('../middleware/validate');

const { HEX_COLOR_PATTERN } = validateBody;

router.use(verifyToken);
router.get('/', subjects.getAll);
router.post('/',
  validateBody({
    name:  { type: 'string', required: true, maxLength: 200 },
    color: { type: 'string', maxLength: 7, pattern: HEX_COLOR_PATTERN },
  }),
  subjects.create
);
router.put('/:id',
  validateId,
  validateBody({
    name:  { type: 'string', maxLength: 200 },
    color: { type: 'string', maxLength: 7, pattern: HEX_COLOR_PATTERN },
  }),
  subjects.update
);
router.delete('/:id', validateId, subjects.remove);

module.exports = router;
