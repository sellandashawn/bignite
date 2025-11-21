const express = require('express');
const { createEvent, getAllEvents, getEventById, updateEvent, deleteEvent } = require('../controllers/eventController');
const authenticateUser = require('../middleware/authMiddleware')
const router = express.Router();
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/createEvent', authenticateUser, upload.single('image'), createEvent);
router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.put('/:id', authenticateUser, upload.single('image'), updateEvent);
router.delete('/:id', authenticateUser, deleteEvent)

module.exports = router;
