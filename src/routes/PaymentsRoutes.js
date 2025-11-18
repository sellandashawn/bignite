const express = require('express');
const router = express.Router();
const { getAllPayments, getPaymentsByEvent } = require('../controllers/paymentsController');

router.get('/payments', getAllPayments);
router.get('/events/:eventId/payments', getPaymentsByEvent);

module.exports = router;