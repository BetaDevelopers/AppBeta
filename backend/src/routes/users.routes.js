const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const users = require('../controllers/users.controller');

router.use(verifyToken);

router.get('/me',         users.getMe);
router.put('/me',         users.updateMe);
router.get('/me/stats',   users.getStats);
router.delete('/me',      users.deleteMe);

module.exports = router;