const router = require('express').Router();
const { verifyCoreAdmin } = require('../middlewares/verifyCoreAdmin');
const controller = require('../controllers/platformOperationsController');
const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

router.use(verifyCoreAdmin);
router.get('/overview', safe(controller.overview));
router.get('/:resource', safe(controller.list));

router.patch('/products/:id', safe(controller.updateProduct));
router.patch('/reviews/:id', safe(controller.updateReview));
router.delete('/reviews/:id', safe(controller.deleteReview));
router.patch('/reports/:id', safe(controller.updateReport));

module.exports = router;
