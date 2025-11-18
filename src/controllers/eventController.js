const Event = require("../models/Event");

exports.createEvent = async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only admins can create events." });
        }

        const {
            eventName,
            venue,
            date,
            category,
            image,
            description,
            maximumOccupancy = 0,
            totalNumberOfPlayers = 0,
            status = "upcoming"
        } = req.body;

        const event = new Event({
            eventName,
            venue,
            date,
            category,
            image: image || "",
            description: description || "",
            ticketStatus: {
                maximumOccupancy,
                totalNumberOfPlayers
            },
            status
        });

        await event.save();

        console.log("Event created successfully by admin:", event.id);

        res.status(201).json({
            message: "Event created successfully",
            event: {
                id: event._id,
                eventId: event.eventId,
                eventName: event.eventName,
                venue: event.venue,
                date: event.date,
                category: event.category,
                image: event.image,
                description: event.description,
                ticketStatus: event.ticketStatus,
                status: event.status,
                createdAt: event.createdAt
            }
        });

    } catch (err) {
        console.error("Error creating event:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

exports.getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().sort({ createdAt: -1 });

        res.json({
            message: "Events retrieved successfully",
            events: events.map(event => ({
                id: event._id,
                eventId: event.eventId,
                eventName: event.eventName,
                venue: event.venue,
                date: event.date,
                category: event.category,
                image: event.image,
                description: event.description,
                ticketStatus: event.ticketStatus,
                status: event.status,
                createdAt: event.createdAt,
                updatedAt: event.updatedAt
            }))
        });

    } catch (err) {
        console.error("Error fetching events:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

exports.getEventById = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await Event.findOne({ _id: id });

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.json({
            message: "Event retrieved successfully",
            event: {
                id: event._id,
                eventId: event.eventId,
                eventName: event.eventName,
                venue: event.venue,
                date: event.date,
                category: event.category,
                image: event.image,
                description: event.description,
                ticketStatus: event.ticketStatus,
                status: event.status,
                createdAt: event.createdAt,
                updatedAt: event.updatedAt
            }
        });

    } catch (err) {
        console.error("Error fetching event:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only admins can update events." });
        }

        const { id } = req.params;
        const {
            eventName,
            venue,
            date,
            category,
            image,
            description,
            maximumOccupancy,
            totalNumberOfPlayers,
            unscannedTickets,
            successfulPayment,
            status
        } = req.body;


        const event = await Event.findOne({ _id: id });

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        if (eventName) event.eventName = eventName;
        if (venue) event.venue = venue;
        if (date) event.date = date;
        if (category) event.category = category;
        if (image !== undefined) event.image = image;
        if (description !== undefined) event.description = description;
        if (status) event.status = status;

        if (maximumOccupancy !== undefined) event.ticketStatus.maximumOccupancy = maximumOccupancy;
        if (totalNumberOfPlayers !== undefined) event.ticketStatus.totalNumberOfPlayers = totalNumberOfPlayers;
        if (unscannedTickets !== undefined) event.ticketStatus.unscannedTickets = unscannedTickets;
        if (successfulPayment !== undefined) event.ticketStatus.successfulPayment = successfulPayment;

        event.updatedAt = new Date();

        await event.save();

        console.log("Event updated successfully by admin:", event._id);

        res.json({
            message: "Event updated successfully",
            event: {
                id: event._id,
                eventId: event.eventId,
                eventName: event.eventName,
                venue: event.venue,
                date: event.date,
                category: event.category,
                image: event.image,
                description: event.description,
                ticketStatus: event.ticketStatus,
                status: event.status,
                createdAt: event.createdAt,
                updatedAt: event.updatedAt
            }
        });

    } catch (err) {
        console.error("Error updating event:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only admins can delete events." });
        }

        const { id } = req.params;

        const event = await Event.findOneAndDelete({ _id: id });

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        console.log("Event deleted successfully by admin:", event._id);

        res.json({
            message: "Event deleted successfully",
            event: {
                id: event._id,
                eventName: event.eventName
            }
        });

    } catch (err) {
        console.error("Error deleting event:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

