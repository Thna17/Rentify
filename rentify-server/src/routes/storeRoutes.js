const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const controller = require('../controllers/storeController');

router.use(verifyToken);
router.get('/mine', controller.getOwnStore);
router.post('/', controller.createStore);
router.patch('/mine', controller.updateOwnStore);

module.exports = router;
