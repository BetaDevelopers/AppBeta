const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notes.controller');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', notesController.getAll);
router.get('/:id', notesController.getOne);
router.post('/', notesController.create);
router.put('/:id', notesController.update);
router.delete('/:id', notesController.remove);

module.exports = router;
