const router = require('express').Router();
const users = require('../controllers/userController');
const { authenticate, requireOwner } = require('../middleware/auth');

router.post('/token', users.token);
router.post('/', users.create);
router.get('/:id', users.find);
router.put('/:id', authenticate, requireOwner, users.update);
router.delete('/:id', authenticate, requireOwner, users.remove);

module.exports = router;

