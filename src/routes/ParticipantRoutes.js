const express = require("express");
const router = express.Router();
const {
  registerParticipantWithPayment,
  getEventParticipants,
  //   scanTicket,
  getParticipantByTicket,
  scanTicketByQR,
} = require("../controllers/participantController");
const authenticateUser = require("../middleware/authMiddleware");

router.post("/:eventId/register-with-payment", registerParticipantWithPayment);
router.get("/participants", authenticateUser, getEventParticipants);

router.get("/:ticketNumber", getParticipantByTicket);
// router.patch("/scan/:ticketNumber", scanTicket);

router.post("/scan-qr", authenticateUser, scanTicketByQR);

module.exports = router;
