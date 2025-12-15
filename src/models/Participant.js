const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  billingInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },

  attendeeInfo: [
    {
      name: { type: String, required: true },
      identificationNumber: { type: String, required: true },
      age: { type: Number },
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true,
      },
      emailAddress: { type: String },
      tshirtSize: {
        // type: String,
        // enum: ["XS", "S", "M", "L", "XL", "XXL"],
        // required: true,
      },
      //   raceCategory: { type: String, required: true },
      teamName: { type: String },
    },
  ],

  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },

  orderId: { type: String, required: true },

  paymentStatus: {
    type: String,
    enum: ["pending", "successful", "failed", "refunded"],
    default: "pending",
  },

  ticketNumbers: [{ type: String, required: true }],
  numberOfTickets: { type: Number, required: true, default: 1 },
  scannedTickets: { type: Number, default: 0 },
  scannedStatus: [{ type: Boolean, default: false }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Participant", participantSchema);
