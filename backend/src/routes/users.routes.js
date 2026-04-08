const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const users = require('../controllers/users.controller');
const { validateBody } = require('../middleware/validate');

const { EMAIL_PATTERN } = validateBody;

router.use(verifyToken);

router.get('/me',       users.getMe);
router.put('/me',
  validateBody({
    email:            { type: 'string', maxLength: 254, pattern: EMAIL_PATTERN },
    display_name:     { type: 'string', maxLength: 80 },
    password:         { type: 'string', minLength: 8,   maxLength: 128 },
    current_password: { type: 'string', maxLength: 128 },
  }),
  users.updateMe
);
router.get('/me/stats', users.getStats);
router.delete('/me',    users.deleteMe);

module.exports = router;
