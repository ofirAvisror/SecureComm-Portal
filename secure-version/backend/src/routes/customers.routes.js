const express = require('express');
const controller = require('../controllers/customers.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);
router.post('/', controller.createCustomer);
router.get('/', controller.listCustomers);

module.exports = router;
