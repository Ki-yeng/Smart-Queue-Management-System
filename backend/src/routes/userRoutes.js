// src/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/authMiddleware");

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      message: "Users retrieved successfully",
      count: users.length,
      users,
    });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/**
 * GET /api/users/staff
 * Get only staff members (admin only)
 */
router.get("/staff", protect, adminOnly, async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" })
      .select("-password")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      message: "Staff members retrieved successfully",
      count: staff.length,
      staff,
    });
  } catch (err) {
    console.error("Get staff error:", err);
    res.status(500).json({ message: "Failed to fetch staff" });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID (admin only)
 */
router.get("/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("createdBy", "name email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { name, email, role, department, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase();
    if (role && ["admin", "staff", "customer"].includes(role)) user.role = role;
    if (department) user.department = department.trim();
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    console.log(`✅ User updated by ${req.user.name}:`, {
      userId: user._id,
      updatedFields: { name, email, role, department, isActive },
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: "User updated successfully",
      user: user.toObject({ versionKey: false }),
    });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

/**
 * DELETE /api/users/:id
 * Delete/deactivate user (admin only)
 * Note: Soft delete by setting isActive to false
 */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: "Cannot delete your own account" });
    }

    // Soft delete
    user.isActive = false;
    await user.save();

    console.log(`✅ User deactivated by ${req.user.name}:`, {
      userId: user._id,
      userName: user.name,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: "User deactivated successfully",
      user: { id: user._id, name: user.name, email: user.email, isActive: user.isActive },
    });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Failed to deactivate user" });
  }
});

/**
 * POST /api/users/:id/reactivate
 * Reactivate deactivated user (admin only)
 */
router.post("/:id/reactivate", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isActive) {
      return res.status(400).json({ message: "User is already active" });
    }

    user.isActive = true;
    await user.save();

    console.log(`✅ User reactivated by ${req.user.name}:`, {
      userId: user._id,
      userName: user.name,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: "User reactivated successfully",
      user: { id: user._id, name: user.name, email: user.email, isActive: user.isActive },
    });
  } catch (err) {
    console.error("Reactivate user error:", err);
    res.status(500).json({ message: "Failed to reactivate user" });
  }
});

module.exports = router;
