const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    userId: { type: String },
    userType: { type: String, enum: ["admin", "user"], required: true, default: "user" },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String },
    address: { type: String },
    city: { type: String },
    dateOfBirth: { type: Date },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);