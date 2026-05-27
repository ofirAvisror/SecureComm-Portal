const express = require('express');
const controller = require('../controllers/catalog.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);
router.get('/packages', controller.listPackages);
router.get('/sectors', controller.listSectors);

module.exports = router;
