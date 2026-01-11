const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Public registration for students/customers
router.post("/register", authController.register);

// Login
router.post("/login", authController.login);

// Admin-only: create staff or other admins
router.post("/create-staff", protect, adminOnly, authController.createStaff);

module.exports = router;
