const express = require("express");
const router = express.Router();
const {
  addCategory,
  getCategories,
  getCategoriesByType,
} = require("../controllers/categoryController");
const authenticateUser = require("../middleware/authMiddleware");

router.post("/", authenticateUser, addCategory);

router.get("/", getCategories);

router.get("/type/:type", getCategoriesByType);

module.exports = router;
