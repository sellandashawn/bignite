const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    eventName: { type: String, required: true },
    venue: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    category: { type: String, required: true },
    image: { type: String },
    description: { type: String },
    perTicketPrice: { type: Number, required: true },
    agenda: [{
        time: { type: String, required: true },
        activity: { type: String, required: true },
    }],

    ticketStatus: {
        maximumOccupancy: { type: Number, default: 0 },
        totalNumberOfPlayers: { type: Number, default: 0 },
        unscannedTickets: { type: Number, default: 0 },
        successfulPayment: { type: Number, default: 0 }
    },

    status: {
        type: String,
        enum: ["cancelled", "completed", "upcoming", "ongoing", "postponed"],
        default: "upcoming"
    },

    raceCategories: [{ type: String }],

    availableTshirtSizes: [{
        type: String,
        enum: ["XS", "S", "M", "L", "XL", "XXL"]
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Event", eventSchema);