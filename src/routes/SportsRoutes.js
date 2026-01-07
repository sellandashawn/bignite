const express = require("express");
const router = express.Router();
const {
  createSport,
  getAllSports,
  getSportById,
  updateSport,
  deleteSport,
  getSportsByCategory,
} = require("../controllers/sportsController");
const authenticateUser = require("../middleware/authMiddleware");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/createSport",
  authenticateUser,
  upload.single("image"),
  createSport
);

router.get("/", getAllSports);

router.get("/category/:categoryName", getSportsByCategory);

router.get("/:id", getSportById);

router.put("/:id", authenticateUser, upload.single("image"), updateSport);

router.delete("/:id", authenticateUser, deleteSport);

module.exports = router;
