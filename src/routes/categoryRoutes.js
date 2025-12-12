const express = require("express");
const router = express.Router();
const {
  addCategory,
  getCategories,
} = require("../controllers/categoryController");
const authenticateUser = require("../middleware/authMiddleware");

router.post("/", authenticateUser, addCategory);

router.get("/", getCategories);

module.exports = router;
