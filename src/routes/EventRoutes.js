const express = require('express');
const { createEvent, getAllEvents, getEventById, updateEvent, deleteEvent } = require('../controllers/eventController');
const authenticateUser = require('../middleware/authMiddleware')
const router = express.Router();

router.post('/createEvent', authenticateUser, createEvent);
router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.put('/:id', authenticateUser, updateEvent);
router.delete('/:id', authenticateUser, deleteEvent)

module.exports = router;
