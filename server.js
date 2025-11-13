const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/AuthRoutes");
const eventRoutes = require("./src/routes/EventRoutes")

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
connectDB();


// Test Route
app.get("/", (req, res) => {
    res.send("API is running...");
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes)


// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
