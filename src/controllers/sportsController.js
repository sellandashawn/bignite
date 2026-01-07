const Sport = require("../models/Sports");
const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");
const stream = require("stream");

exports.createSport = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Only admins can create sports." });
    }

    const {
      sportName,
      venue,
      date,
      time,
      category,
      description,
      registrationFee = 0,
      schedule = [],
      maximumParticipants = 0,
      registeredParticipants = 0,
      pendingRegistrations = 0,
      confirmedParticipants = 0,
      status = "upcoming",
      sportType = "individual",
      teamSize = 1,
    } = req.body;

    if (!sportName || !venue || !date || !time || !category) {
      return res.status(400).json({
        message:
          "Missing required fields: sportName, venue, date, time, and category are required.",
      });
    }

    const sportCategory = await Category.findOne({ name: category });
    if (!sportCategory) {
      return res.status(400).json({
        message: "Invalid category. Please select an existing category.",
      });
    }

    // Validate sport type
    const validSportTypes = ["individual", "team", "both"];
    if (!validSportTypes.includes(sportType)) {
      return res.status(400).json({
        message: "Invalid sport type. Must be one of: individual, team, both",
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
              folder: "sports_images",
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

    const sport = new Sport({
      sportName,
      venue,
      date,
      time,
      category: sportCategory._id,
      image: imageUrl,
      description: description || "",
      registrationFee,
      schedule: Array.isArray(schedule)
        ? schedule
        : JSON.parse(schedule || "[]"),
      participationStatus: {
        maximumParticipants: parseInt(maximumParticipants) || 0,
        registeredParticipants: parseInt(registeredParticipants) || 0,
        pendingRegistrations: parseInt(pendingRegistrations) || 0,
        confirmedParticipants: parseInt(confirmedParticipants) || 0,
      },
      status,
      sportType,
      teamSize: parseInt(teamSize) || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await sport.save();

    console.log("Sport created successfully by admin:", sport.id);

    res.status(201).json({
      message: "Sport created successfully",
      sport: {
        id: sport._id,
        sportName: sport.sportName,
        venue: sport.venue,
        date: sport.date,
        time: sport.time,
        category: sport.category,
        image: sport.image,
        description: sport.description,
        registrationFee: sport.registrationFee,
        schedule: sport.schedule,
        participationStatus: sport.participationStatus,
        status: sport.status,
        sportType: sport.sportType,
        teamSize: sport.teamSize,
        createdAt: sport.createdAt,
        updatedAt: sport.updatedAt,
      },
    });
  } catch (err) {
    console.error("Error creating sport:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAllSports = async (req, res) => {
  try {
    const sports = await Sport.find()
      .populate("category")
      .sort({ createdAt: -1 });

    res.json({
      message: "Sports retrieved successfully",
      sports: sports.map((sport) => ({
        id: sport._id,
        sportName: sport.sportName,
        venue: sport.venue,
        date: sport.date,
        time: sport.time,
        category: sport.category,
        image: sport.image,
        description: sport.description,
        registrationFee: sport.registrationFee,
        schedule: sport.schedule,
        participationStatus: sport.participationStatus,
        status: sport.status,
        sportType: sport.sportType,
        teamSize: sport.teamSize,
        createdAt: sport.createdAt,
        updatedAt: sport.updatedAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching sports:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getSportsByCategory = async (req, res) => {
  try {
    const { categoryName } = req.params;

    // First, find the category by name
    const category = await Category.findOne({ name: categoryName });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    // Find sports with this category ID
    const sports = await Sport.find({ category: category._id })
      .populate("category")
      .sort({ createdAt: -1 });

    res.json({
      message: `Sports in category '${categoryName}' retrieved successfully`,
      category: {
        id: category._id,
        name: category.name,
        description: category.description,
        type: category.type,
      },
      count: sports.length,
      sports: sports.map((sport) => ({
        id: sport._id,
        sportName: sport.sportName,
        venue: sport.venue,
        date: sport.date,
        time: sport.time,
        category: sport.category,
        image: sport.image,
        description: sport.description,
        registrationFee: sport.registrationFee,
        schedule: sport.schedule,
        participationStatus: sport.participationStatus,
        status: sport.status,
        sportType: sport.sportType,
        teamSize: sport.teamSize,
        createdAt: sport.createdAt,
        updatedAt: sport.updatedAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching sports by category:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getSportById = async (req, res) => {
  try {
    const { id } = req.params;

    const sport = await Sport.findOne({ _id: id }).populate("category");

    if (!sport) {
      return res.status(404).json({ message: "Sport not found" });
    }

    res.json({
      message: "Sport retrieved successfully",
      sport: {
        id: sport._id,
        sportName: sport.sportName,
        venue: sport.venue,
        date: sport.date,
        time: sport.time,
        category: sport.category.name,
        image: sport.image,
        description: sport.description,
        registrationFee: sport.registrationFee,
        schedule: sport.schedule,
        participationStatus: sport.participationStatus,
        status: sport.status,
        sportType: sport.sportType,
        teamSize: sport.teamSize,
        createdAt: sport.createdAt,
        updatedAt: sport.updatedAt,
      },
    });
  } catch (err) {
    console.error("Error fetching sport:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateSport = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Only admins can update sports." });
    }

    const sportId = req.params.id;
    const sport = await Sport.findById(sportId);

    if (!sport) {
      return res.status(404).json({ message: "Sport not found" });
    }

    const {
      sportName,
      venue,
      date,
      time,
      category,
      description,
      registrationFee,
      schedule = [],
      maximumParticipants = 0,
      registeredParticipants = 0,
      pendingRegistrations = 0,
      confirmedParticipants = 0,
      status = "upcoming",
      sportType = "individual",
      teamSize = 1,
    } = req.body;

    let sportCategory = sport.category;
    if (category) {
      const categoryData = await Category.findOne({ name: category });
      if (!categoryData) {
        return res.status(400).json({
          message: "Invalid category. Please select an existing category.",
        });
      }
      sportCategory = categoryData._id;
    }

    // Validate sport type if provided
    if (sportType) {
      const validSportTypes = ["individual", "team", "both"];
      if (!validSportTypes.includes(sportType)) {
        return res.status(400).json({
          message: "Invalid sport type. Must be one of: individual, team, both",
        });
      }
    }

    let parsedSchedule = [];
    if (typeof schedule === "string") {
      try {
        parsedSchedule = JSON.parse(schedule);
      } catch (error) {
        console.error("Error parsing schedule:", error);
        parsedSchedule = [];
      }
    } else if (Array.isArray(schedule)) {
      parsedSchedule = schedule;
    }

    let imageUrl = sport.image;
    if (req.file) {
      try {
        console.log("Uploading new image to Cloudinary for update...");

        if (sport.image) {
          const publicId = sport.image.split("/").pop().split(".")[0];
          try {
            await cloudinary.uploader.destroy(`sports_images/${publicId}`);
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
              folder: "sports_images",
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
      sportName: sportName || sport.sportName,
      venue: venue || sport.venue,
      date: date || sport.date,
      time: time || sport.time,
      category: sportCategory,
      description: description || sport.description,
      registrationFee:
        registrationFee !== undefined ? registrationFee : sport.registrationFee,
      image: imageUrl,
      schedule: parsedSchedule.length > 0 ? parsedSchedule : sport.schedule,
      participationStatus: {
        maximumParticipants:
          parseInt(maximumParticipants) ||
          sport.participationStatus.maximumParticipants,
        registeredParticipants:
          parseInt(registeredParticipants) ||
          sport.participationStatus.registeredParticipants,
        pendingRegistrations:
          parseInt(pendingRegistrations) ||
          sport.participationStatus.pendingRegistrations,
        confirmedParticipants:
          parseInt(confirmedParticipants) ||
          sport.participationStatus.confirmedParticipants,
      },
      status: status || sport.status,
      sportType: sportType || sport.sportType,
      teamSize: parseInt(teamSize) || sport.teamSize,
      updatedAt: new Date(),
    };

    const updatedSport = await Sport.findByIdAndUpdate(sportId, updateData, {
      new: true,
      runValidators: true,
    });

    console.log("Sport updated successfully:", updatedSport._id);

    res.status(200).json({
      message: "Sport updated successfully",
      sport: {
        id: updatedSport._id,
        sportName: updatedSport.sportName,
        venue: updatedSport.venue,
        date: updatedSport.date,
        time: updatedSport.time,
        category: updatedSport.category,
        image: updatedSport.image,
        description: updatedSport.description,
        registrationFee: updatedSport.registrationFee,
        schedule: updatedSport.schedule,
        participationStatus: updatedSport.participationStatus,
        status: updatedSport.status,
        sportType: updatedSport.sportType,
        teamSize: updatedSport.teamSize,
        createdAt: updatedSport.createdAt,
        updatedAt: updatedSport.updatedAt,
      },
    });
  } catch (err) {
    console.error("Error updating sport:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deleteSport = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Only admins can delete sports." });
    }

    const { id } = req.params;

    const sport = await Sport.findOneAndDelete({ _id: id });

    if (!sport) {
      return res.status(404).json({ message: "Sport not found" });
    }

    console.log("Sport deleted successfully by admin:", sport._id);

    res.json({
      message: "Sport deleted successfully",
      sport: {
        id: sport._id,
        sportName: sport.sportName,
      },
    });
  } catch (err) {
    console.error("Error deleting sport:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
