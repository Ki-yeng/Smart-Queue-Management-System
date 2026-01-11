const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify token and set req.user
exports.protect = async (req, res, next) => {
  try {
    // look for token in Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    const secret = process.env.JWT_SECRET || "dev_secret";
    const decoded = jwt.verify(token, secret); // throws if invalid

    // attach user info (you can fetch more from DB if needed)
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ message: "Not authorized" });
  }
};

// Admin check middleware (use after protect)
exports.adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
  next();
};
