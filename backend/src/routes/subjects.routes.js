const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const subjects = require('../controllers/subjects.controller');

router.use(verifyToken);
router.get('/',    subjects.getAll);
router.post('/',   subjects.create);
router.put('/:id', subjects.update);
router.delete('/:id', subjects.remove);

module.exports = router;
