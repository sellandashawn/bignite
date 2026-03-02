const express = require('express');
const router = express.Router();
const { getAllPayments, getPaymentsByEvent, getPaymentsBySport } = require('../controllers/paymentsController');

router.get('/payments', getAllPayments);
router.get('/events/:eventId/payments', getPaymentsByEvent);
router.get('/sports/:sportId/payments', getPaymentsBySport);

module.exports = router;