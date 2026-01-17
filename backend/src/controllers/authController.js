const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ===== TOKEN GENERATION HELPERS =====

// Generate short-lived access token (15 minutes)
function generateAccessToken(user) {
  const payload = {
    id: user._id,
    role: user.role,
    email: user.email,
  };
  const secret = process.env.JWT_SECRET || "dev_secret";
  const expiresIn = process.env.JWT_EXPIRES_IN || "15m";
  return jwt.sign(payload, secret, { expiresIn });
}

// Generate long-lived refresh token (7 days)
function generateRefreshToken(user) {
  const payload = {
    id: user._id,
    type: "refresh",
  };
  const secret = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  return jwt.sign(payload, secret, { expiresIn });
}

// Legacy: kept for backward compatibility
function signToken(user) {
  return generateAccessToken(user);
}

// Public registration for customers (role defaults to 'customer')
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }

    // check for existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use." });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // create user with default role 'customer'
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: "customer",
    });

    // respond (do not return password)
    res.status(201).json({
      message: "Registration successful",
      user: { id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin-only: create staff or admin accounts
exports.createStaff = async (req, res) => {
  try {
    // ===== ADMIN VERIFICATION =====
    // Middleware (protect, adminOnly) already verified this, but double-check
    const creator = req.user;
    
    if (!creator) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (creator.role !== "admin") {
      return res.status(403).json({ 
        message: "Forbidden: Only administrators can create staff accounts",
        userRole: creator.role 
      });
    }

    // ===== REQUEST VALIDATION =====
    const { name, email, password, role, department } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required and cannot be empty" });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // ===== ROLE VALIDATION =====
    // Only admin can create other admins
    const allowedRoles = ["staff", "admin"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ 
        message: `Invalid role. Allowed roles: ${allowedRoles.join(", ")}` 
      });
    }

    // Prevent non-root admins from creating other admins (if needed)
    // Uncomment this if you want only one admin to create other admins:
    // if (role === "admin" && creator.role !== "rootAdmin") {
    //   return res.status(403).json({ message: "Only root admin can create admin accounts" });
    // }

    // ===== CHECK FOR DUPLICATE EMAIL =====
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ 
        message: "Email already registered. Please use a different email." 
      });
    }

    // ===== CREATE USER ACCOUNT =====
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashed,
      role: role || "staff",
      department: department || "General", // Optional department field
      createdBy: creator._id, // Track who created this account
      createdAt: new Date(),
    });

    // ===== AUDIT LOG =====
    console.log(`✅ Staff account created:`, {
      createdBy: creator.name,
      creatorId: creator._id,
      newUser: newUser.name,
      newUserId: newUser._id,
      role: newUser.role,
      timestamp: new Date().toISOString(),
    });

    // ===== RESPONSE =====
    res.status(201).json({
      message: `${role || "staff"} account created successfully`,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        createdAt: newUser.createdAt,
      },
      admin: {
        createdBy: creator.name,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (err) {
    console.error("❌ Create staff error:", err.message);
    
    // Handle specific MongoDB validation errors
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({ message: "Server error while creating staff account" });
  }
};

// Login (all roles)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check if account is active (default to true for existing users without this field)
    if (user.isActive === false) {
      return res.status(403).json({ message: "Account has been disabled. Contact administrator." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Calculate refresh token expiration (7 days from now)
    const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save refresh token to database
    try {
      await User.findByIdAndUpdate(user._id, { 
        refreshToken,
        refreshTokenExpires,
        lastLogin: new Date(),
      });
    } catch (saveErr) {
      console.warn("Could not save refresh token:", saveErr.message);
      // Continue with login even if this fails
    }

    // return tokens and user info (no password)
    res.json({
      message: "Login successful",
      token: accessToken,
      refreshToken,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        department: user.department || null,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Logout (all roles)
exports.logout = async (req, res) => {
  try {
    // Since JWT is stateless, logout on backend is mainly symbolic
    // The actual token invalidation happens on the frontend (localStorage.removeItem)
    // In production, you'd implement a token blacklist for additional security
    
    res.json({
      message: "Logout successful",
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get current user (protected route)
exports.getCurrentUser = async (req, res) => {
  try {
    // req.user is set by protect middleware
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Fetch fresh user data from DB (don't rely on token data)
    const user = await User.findById(req.user._id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Current user fetched",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Refresh access token using refresh token
exports.refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    // Verify refresh token
    let decoded;
    try {
      const secret = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";
      decoded = jwt.verify(refreshToken, secret);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    // Find user by ID
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify refresh token matches what's stored
    if (user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Refresh token mismatch" });
    }

    // Check if refresh token has expired
    if (user.refreshTokenExpires && new Date() > user.refreshTokenExpires) {
      return res.status(401).json({ message: "Refresh token expired" });
    }

    // Check if account is active
    if (user.isActive === false) {
      return res.status(403).json({ message: "Account has been disabled" });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    res.json({
      message: "Token refreshed successfully",
      token: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Token refresh error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
