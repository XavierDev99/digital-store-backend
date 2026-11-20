const router = require('express').Router();
const categories = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');

router.get('/search', categories.search);
router.get('/:id', categories.find);
router.post('/', authenticate, categories.create);
router.put('/:id', authenticate, categories.update);
router.delete('/:id', authenticate, categories.remove);

module.exports = router;

