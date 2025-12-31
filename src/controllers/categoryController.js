const Category = require("../models/Category");

// Add a new category
exports.addCategory = async (req, res) => {
  try {
    const { name, description, type } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const validTypes = ["event", "sports"];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        message:
          "Invalid category type. Must be one of: event, sports, general",
      });
    }

    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return res
        .status(400)
        .json({ message: "Category with this name already exists" });
    }

    const newCategory = new Category({
      name,
      description,
      type,
    });
    await newCategory.save();

    res.status(201).json({
      message: "Category created successfully",
      category: {
        id: newCategory._id,
        name: newCategory.name,
        description: newCategory.description,
        type: newCategory.type,
        createdAt: newCategory.createdAt,
      },
    });
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();

    res.json({
      message: "Categories retrieved successfully",
      categories: categories.map((category) => ({
        id: category._id,
        name: category.name,
        description: category.description,
        type: category.type,
        createdAt: category.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//Get categories by type
exports.getCategoriesByType = async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ["event", "sports"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message:
          "Invalid category type. Must be one of: event, sports, general",
      });
    }

    const categories = await Category.find({ type });

    res.json({
      message: `Categories of type '${type}' retrieved successfully`,
      categories: categories.map((category) => ({
        id: category._id,
        name: category.name,
        description: category.description,
        type: category.type,
        createdAt: category.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching categories by type:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
