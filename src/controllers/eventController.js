const Event = require("../models/Event");
const cloudinary = require('../config/cloudinary');
const stream = require('stream');

exports.createEvent = async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only admins can create events." });
        }

        const {
            eventName,
            venue,
            date,
            time,
            category,
            description,
            perTicketPrice,
            agenda = [],
            maximumOccupancy = 0,
            totalNumberOfPlayers = 0,
            unscannedTickets = 0,
            successfulPayment = 0,
            status = "upcoming",
            raceCategories = [],
            availableTshirtSizes = []
        } = req.body;

        if (!eventName || !venue || !date || !time || !category || perTicketPrice === undefined) {
            return res.status(400).json({
                message: "Missing required fields: eventName, venue, date, time, category, and perTicketPrice are required."
            });
        }

        let imageUrl = "";

        if (req.file) {
            try {
                const bufferStream = new stream.PassThrough();
                bufferStream.end(req.file.buffer);

                const uploadResponse = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: 'events_images',
                            resource_type: "image"
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    bufferStream.pipe(uploadStream);
                });

                imageUrl = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error("Error uploading image to Cloudinary:", uploadError);
                return res.status(500).json({ message: "Error uploading image", error: uploadError.message });
            }
        }

        const event = new Event({
            eventName,
            venue,
            date,
            time,
            category,
            image: imageUrl,
            description: description || "",
            perTicketPrice,
            agenda: Array.isArray(agenda) ? agenda : JSON.parse(agenda || '[]'),
            ticketStatus: {
                maximumOccupancy: parseInt(maximumOccupancy) || 0,
                totalNumberOfPlayers: parseInt(totalNumberOfPlayers) || 0,
                unscannedTickets: parseInt(unscannedTickets) || 0,
                successfulPayment: parseInt(successfulPayment) || 0
            },
            status,
            raceCategories: Array.isArray(raceCategories) ? raceCategories : JSON.parse(raceCategories || '[]'),
            availableTshirtSizes: Array.isArray(availableTshirtSizes) ? availableTshirtSizes : JSON.parse(availableTshirtSizes || '[]'),
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await event.save();

        console.log("Event created successfully by admin:", event.id);

        res.status(201).json({
            message: "Event created successfully",
            event: {
                id: event._id,
                eventName: event.eventName,
                venue: event.venue,
                date: event.date,
                time: event.time,
                category: event.category,
                image: event.image,
                description: event.description,
                perTicketPrice: event.perTicketPrice,
                agenda: event.agenda,
                ticketStatus: event.ticketStatus,
                status: event.status,
                raceCategories: event.raceCategories,
                availableTshirtSizes: event.availableTshirtSizes,
                createdAt: event.createdAt,
                updatedAt: event.updatedAt
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
                eventName: event.eventName,
                venue: event.venue,
                date: event.date,
                time: event.time,
                category: event.category,
                image: event.image,
                description: event.description,
                perTicketPrice: event.perTicketPrice,
                agenda: event.agenda,
                ticketStatus: event.ticketStatus,
                status: event.status,
                raceCategories: event.raceCategories,
                availableTshirtSizes: event.availableTshirtSizes,
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
                eventName: event.eventName,
                venue: event.venue,
                date: event.date,
                time: event.time,
                category: event.category,
                image: event.image,
                description: event.description,
                perTicketPrice: event.perTicketPrice,
                agenda: event.agenda,
                ticketStatus: event.ticketStatus,
                status: event.status,
                raceCategories: event.raceCategories,
                availableTshirtSizes: event.availableTshirtSizes,
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
            time,
            category,
            image,
            description,
            perTicketPrice,
            agenda,
            maximumOccupancy,
            totalNumberOfPlayers,
            unscannedTickets,
            successfulPayment,
            status,
            raceCategories,
            availableTshirtSizes
        } = req.body;

        const event = await Event.findOne({ _id: id });

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        let imageUrl = event.image;

        if (req.file) {
            try {
                console.log("Uploading new image to Cloudinary for update...");

                const bufferStream = new stream.PassThrough();
                bufferStream.end(req.file.buffer);

                const uploadResponse = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: 'events_images',
                            resource_type: "auto"
                        },
                        (error, result) => {
                            if (error) {
                                console.error("Cloudinary upload error:", error);
                                reject(error);
                            } else {
                                console.log("Cloudinary upload successful:", result);
                                resolve(result);
                            }
                        }
                    );
                    bufferStream.pipe(uploadStream);
                });

                imageUrl = uploadResponse.secure_url;
                console.log("New image URL:", imageUrl);

            } catch (uploadError) {
                console.error("Error uploading image to Cloudinary:", uploadError);
                return res.status(500).json({
                    message: "Error uploading image",
                    error: uploadError.message
                });
            }
        }

        if (eventName !== undefined) event.eventName = eventName;
        if (venue !== undefined) event.venue = venue;
        if (date !== undefined) event.date = date;
        if (time !== undefined) event.time = time;
        if (category !== undefined) event.category = category;
        if (image !== undefined) event.image = image;
        if (description !== undefined) event.description = description;
        if (perTicketPrice !== undefined) event.perTicketPrice = perTicketPrice;
        if (agenda !== undefined) event.agenda = agenda;
        if (status !== undefined) event.status = status;
        if (req.file) {
            event.image = imageUrl;
        } else if (req.body.image !== undefined) {
            if (req.body.image === '') {
                event.image = '';
            } else if (req.body.image !== null) {
                event.image = req.body.image;
            }
        }
        if (raceCategories !== undefined) event.raceCategories = raceCategories;
        if (availableTshirtSizes !== undefined) event.availableTshirtSizes = availableTshirtSizes;

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
                eventName: event.eventName,
                venue: event.venue,
                date: event.date,
                time: event.time,
                category: event.category,
                image: event.image,
                description: event.description,
                perTicketPrice: event.perTicketPrice,
                agenda: event.agenda,
                ticketStatus: event.ticketStatus,
                status: event.status,
                raceCategories: event.raceCategories,
                availableTshirtSizes: event.availableTshirtSizes,
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

