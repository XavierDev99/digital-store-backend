const router = require('express').Router();
const products = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');

router.get('/search', products.search);
router.get('/:id', products.find);
router.post('/', authenticate, products.create);
router.put('/:id', authenticate, products.update);
router.delete('/:id', authenticate, products.remove);

module.exports = router;

