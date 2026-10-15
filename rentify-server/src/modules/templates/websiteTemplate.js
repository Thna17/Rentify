const express = require('express');
const router = express.Router();
const { getAllTemplates, getTemplateById, getTemplatesByCategory } = require('./websiteTemplateController');

router.get('/', getAllTemplates);
router.get('/:id', getTemplateById);
router.get('/category/:category', getTemplatesByCategory)
module.exports = router;