const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Participant",
    required: true,
  },
  numberOfTickets: { type: Number, default: 1 },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: false,
  },
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sport",
    required: false,
  },
});

module.exports = mongoose.model("Payment", paymentSchema);
