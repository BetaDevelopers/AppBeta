const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const { validateBody } = require('../middleware/validate');

const { EMAIL_PATTERN } = validateBody;

router.post('/register',
  validateBody({
    email:    { type: 'string', required: true, maxLength: 254, pattern: EMAIL_PATTERN },
    password: { type: 'string', required: true, minLength: 8,   maxLength: 128 },
  }),
  auth.register
);

router.post('/login',
  validateBody({
    email:    { type: 'string', required: true, maxLength: 254 },
    password: { type: 'string', required: true, maxLength: 128 },
  }),
  auth.login
);

router.post('/forgot-password',
  validateBody({
    email: { type: 'string', required: true, maxLength: 254, pattern: EMAIL_PATTERN },
  }),
  auth.forgotPassword
);

module.exports = router;
