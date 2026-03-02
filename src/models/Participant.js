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
    required: false,
  },

  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sport",
    required: false,
  },

  isSport: {
    type: Boolean,
    default: false,
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

  qrCodes: [
    {
      ticketNumber: { type: String },
      qrData: { type: String },
      qrHash: { type: String },
      isUsed: { type: Boolean, default: false },
      usedAt: { type: Date },
      scannedBy: { type: String },
    },
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Participant", participantSchema);
