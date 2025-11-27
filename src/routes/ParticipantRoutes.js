const express = require('express');
const router = express.Router();
const { registerParticipantWithPayment, getEventParticipants, scanTicket, getParticipantByTicket } = require('../controllers/participantController');
const authenticateUser = require('../middleware/authMiddleware')

router.post('/:eventId/register-with-payment', registerParticipantWithPayment);
router.get('/participants', authenticateUser, getEventParticipants);

router.get('/:ticketNumber', getParticipantByTicket);
router.patch('/scan/:ticketNumber', scanTicket);


module.exports = router;