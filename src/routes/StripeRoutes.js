const express = require("express");
const router = express.Router();
const {createCheckoutSession} = require("../controllers/stripeController");

// Checkout session
router.post("/create-checkout-session", createCheckoutSession);

module.exports = router;