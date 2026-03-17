const express = require('express');
const router = express.Router();
const subjectsController = require('../controllers/subjects.controller');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', subjectsController.getAll);
router.post('/', subjectsController.create);
router.put('/:id', subjectsController.update);
router.delete('/:id', subjectsController.remove);

module.exports = router;
