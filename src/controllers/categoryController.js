const Category = require("../models/Category");

// Add a new category
exports.addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return res
        .status(400)
        .json({ message: "Category with this name already exists" });
    }

    const newCategory = new Category({ name, description });
    await newCategory.save();

    res.status(201).json({
      message: "Category created successfully",
      category: {
        id: newCategory._id,
        name: newCategory.name,
        description: newCategory.description,
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
        createdAt: category.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
