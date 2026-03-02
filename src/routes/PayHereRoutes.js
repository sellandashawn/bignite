const express = require("express");
const router = express.Router();

const {
  createPayHereCheckout,
  handlePayHereNotification,
} = require("../controllers/payhereController");

router.post("/create-checkout", createPayHereCheckout);
router.post("/notify", handlePayHereNotification);

module.exports = router;

