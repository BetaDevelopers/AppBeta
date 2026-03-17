const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const notes = require('../controllers/notes.controller');

router.use(verifyToken);
router.get('/search', notes.search);   // ABANS de /:id !
router.get('/',       notes.getAll);
router.get('/:id',    notes.getOne);
router.post('/',      notes.create);
router.put('/:id',    notes.update);
router.delete('/:id', notes.remove);

module.exports = router;
