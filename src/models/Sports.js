const mongoose = require("mongoose");

const sportsSchema = new mongoose.Schema({
  sportName: {
    type: String,
    required: true,
  },
  venue: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  image: {
    type: String,
  },
  description: {
    type: String,
  },

  registrationFee: {
    type: Number,
    default: 0,
  },

  schedule: [
    {
      time: { type: String, required: true },
      activity: { type: String, required: true },
    },
  ],

  participationStatus: {
    maximumParticipants: { type: Number, default: 0 },
    registeredParticipants: { type: Number, default: 0 },
    pendingRegistrations: { type: Number, default: 0 },
    confirmedParticipants: { type: Number, default: 0 },
  },

  status: {
    type: String,
    enum: ["cancelled", "completed", "upcoming", "ongoing", "postponed"],
    default: "upcoming",
  },

  teamSize: {
    type: Number,
    default: 1,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Sport", sportsSchema);
