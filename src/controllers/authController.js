const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const SECRET_KEY = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      address,
      city,
      dateOfBirth,
      userType = "user"
    } = req.body;

    console.log("Registering user with email:", email);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = `USER_${Date.now()}`;

    const userData = {
      userId,
      userType,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone: phone || "",
    };

    if (userType !== "admin") {
      userData.address = address || "";
      userData.city = city || "";
      userData.dateOfBirth = dateOfBirth || null;
    } else {
      if (address) userData.address = address;
      if (city) userData.city = city;
      if (dateOfBirth) userData.dateOfBirth = dateOfBirth;
    }

    const user = new User(userData);
    await user.save();

    console.log("User created successfully:", user.email);

    const userResponse = {
      id: user._id,
      userId: user.userId,
      userType: user.userType,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    };

    if (user.address) userResponse.address = user.address;
    if (user.city) userResponse.city = user.city;
    if (user.dateOfBirth) userResponse.dateOfBirth = user.dateOfBirth;

    userResponse.createdAt = user.createdAt;

    res.status(201).json({
      message: "User registered successfully",
      user: userResponse
    });

  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        userId: user.userId,
        email: user.email,
        userType: user.userType
      },
      SECRET_KEY,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        userId: user.userId,
        userType: user.userType,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        dateOfBirth: user.dateOfBirth,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};