const Event = require("../models/Event");
const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");
const stream = require("stream");

exports.createEvent = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Only admins can create events." });
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
      availableTshirtSizes = [],
    } = req.body;

    if (
      !eventName ||
      !venue ||
      !date ||
      !time ||
      !category ||
      perTicketPrice === undefined
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: eventName, venue, date, time, category, and perTicketPrice are required.",
      });
    }
    const eventCategory = await Category.findOne({ name: category });
    if (!eventCategory) {
      return res.status(400).json({
        message: "Invalid category. Please select an existing category.",
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
              folder: "events_images",
              resource_type: "image",
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
        return res.status(500).json({
          message: "Error uploading image",
          error: uploadError.message,
        });
      }
    }

    const event = new Event({
      eventName,
      venue,
      date,
      time,
      category: eventCategory._id,
      image: imageUrl,
      description: description || "",
      perTicketPrice,
      agenda: Array.isArray(agenda) ? agenda : JSON.parse(agenda || "[]"),
      ticketStatus: {
        maximumOccupancy: parseInt(maximumOccupancy) || 0,
        totalNumberOfPlayers: parseInt(totalNumberOfPlayers) || 0,
        unscannedTickets: parseInt(unscannedTickets) || 0,
        successfulPayment: parseInt(successfulPayment) || 0,
      },
      status,
      raceCategories: Array.isArray(raceCategories)
        ? raceCategories
        : JSON.parse(raceCategories || "[]"),
      availableTshirtSizes: Array.isArray(availableTshirtSizes)
        ? availableTshirtSizes
        : JSON.parse(availableTshirtSizes || "[]"),
      createdAt: new Date(),
      updatedAt: new Date(),
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
        updatedAt: event.updatedAt,
      },
    });
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("category")
      .sort({ createdAt: -1 });

    res.json({
      message: "Events retrieved successfully",
      events: events.map((event) => ({
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
        updatedAt: event.updatedAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findOne({ _id: id }).populate("category");

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
        category: event.category.name,
        image: event.image,
        description: event.description,
        perTicketPrice: event.perTicketPrice,
        agenda: event.agenda,
        ticketStatus: event.ticketStatus,
        status: event.status,
        raceCategories: event.raceCategories,
        availableTshirtSizes: event.availableTshirtSizes,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  } catch (err) {
    console.error("Error fetching event:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Only admins can update events." });
    }

    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
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
      availableTshirtSizes = [],
    } = req.body;

    let eventCategory = event.category;
    if (category) {
      const categoryData = await Category.findOne({ name: category });
      if (!categoryData) {
        return res.status(400).json({
          message: "Invalid category. Please select an existing category.",
        });
      }
      eventCategory = categoryData._id;
    }
    let parsedAgenda = [];
    if (typeof agenda === "string") {
      try {
        parsedAgenda = JSON.parse(agenda);
      } catch (error) {
        console.error("Error parsing agenda:", error);
        parsedAgenda = [];
      }
    } else if (Array.isArray(agenda)) {
      parsedAgenda = agenda;
    }

    let parsedRaceCategories = [];
    if (typeof raceCategories === "string") {
      try {
        parsedRaceCategories = JSON.parse(raceCategories);
      } catch (error) {
        console.error("Error parsing raceCategories:", error);
        parsedRaceCategories = [];
      }
    } else if (Array.isArray(raceCategories)) {
      parsedRaceCategories = raceCategories;
    }

    let parsedTshirtSizes = [];
    if (typeof availableTshirtSizes === "string") {
      try {
        parsedTshirtSizes = JSON.parse(availableTshirtSizes);
      } catch (error) {
        console.error("Error parsing availableTshirtSizes:", error);
        parsedTshirtSizes = [];
      }
    } else if (Array.isArray(availableTshirtSizes)) {
      parsedTshirtSizes = availableTshirtSizes;
    }

    let imageUrl = event.image;
    if (req.file) {
      try {
        console.log("Uploading new image to Cloudinary for update...");

        if (event.image) {
          const publicId = event.image.split("/").pop().split(".")[0];
          try {
            await cloudinary.uploader.destroy(`events_images/${publicId}`);
            console.log("Old image deleted from Cloudinary");
          } catch (deleteError) {
            console.error("Error deleting old image:", deleteError);
          }
        }

        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);

        const uploadResponse = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "events_images",
              resource_type: "image",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
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
          error: uploadError.message,
        });
      }
    }

    const updateData = {
      eventName: eventName || event.eventName,
      venue: venue || event.venue,
      date: date || event.date,
      time: time || event.time,
      category: eventCategory,
      description: description || event.description,
      perTicketPrice:
        perTicketPrice !== undefined ? perTicketPrice : event.perTicketPrice,
      image: imageUrl,
      agenda: parsedAgenda.length > 0 ? parsedAgenda : event.agenda,
      ticketStatus: {
        maximumOccupancy:
          parseInt(maximumOccupancy) || event.ticketStatus.maximumOccupancy,
        totalNumberOfPlayers:
          parseInt(totalNumberOfPlayers) ||
          event.ticketStatus.totalNumberOfPlayers,
        unscannedTickets:
          parseInt(unscannedTickets) || event.ticketStatus.unscannedTickets,
        successfulPayment:
          parseInt(successfulPayment) || event.ticketStatus.successfulPayment,
      },
      status: status || event.status,
      raceCategories:
        parsedRaceCategories.length > 0
          ? parsedRaceCategories
          : event.raceCategories,
      availableTshirtSizes:
        parsedTshirtSizes.length > 0
          ? parsedTshirtSizes
          : event.availableTshirtSizes,
      updatedAt: new Date(),
    };

    const updatedEvent = await Event.findByIdAndUpdate(eventId, updateData, {
      new: true,
      runValidators: true,
    });

    console.log("Event updated successfully:", updatedEvent._id);

    res.status(200).json({
      message: "Event updated successfully",
      event: {
        id: updatedEvent._id,
        eventName: updatedEvent.eventName,
        venue: updatedEvent.venue,
        date: updatedEvent.date,
        time: updatedEvent.time,
        category: updatedEvent.category,
        image: updatedEvent.image,
        description: updatedEvent.description,
        perTicketPrice: updatedEvent.perTicketPrice,
        agenda: updatedEvent.agenda,
        ticketStatus: updatedEvent.ticketStatus,
        status: updatedEvent.status,
        raceCategories: updatedEvent.raceCategories,
        availableTshirtSizes: updatedEvent.availableTshirtSizes,
        createdAt: updatedEvent.createdAt,
        updatedAt: updatedEvent.updatedAt,
      },
    });
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Only admins can delete events." });
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
        eventName: event.eventName,
      },
    });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
