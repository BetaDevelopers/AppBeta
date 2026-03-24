const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const notes = require('../controllers/notes.controller');

router.use(verifyToken);
router.get('/search',      notes.search);   
router.get('/',            notes.getAll);
router.get('/:id',         notes.getOne);
router.get('/:id/versions', notes.getVersions); // Nou endpoint historial
router.post('/',           notes.create);
router.put('/:id',         notes.update);
router.delete('/:id',      notes.remove);

module.exports = router;
