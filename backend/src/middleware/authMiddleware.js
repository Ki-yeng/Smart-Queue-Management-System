const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ===== AUTHENTICATION MIDDLEWARE =====

/**
 * Verify JWT token and attach user to request
 * Use this on all protected routes
 */
exports.protect = async (req, res, next) => {
  try {
    // look for token in Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    const secret = process.env.JWT_SECRET || "dev_secret";
    let decoded;
    
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Fetch fresh user data from DB
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });

    // Check if user account is active
    if (user.isActive === false) {
      return res.status(403).json({ message: "Account has been disabled" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Not authorized" });
  }
};

// ===== ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE =====

/**
 * Admin only - requires admin role
 */
exports.adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role !== "admin") {
    return res.status(403).json({ 
      message: "Forbidden: Admin access required",
      userRole: req.user.role 
    });
  }
  next();
};

/**
 * Staff only - requires staff or admin role
 */
exports.staffOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!["staff", "admin"].includes(req.user.role)) {
    return res.status(403).json({ 
      message: "Forbidden: Staff access required",
      userRole: req.user.role 
    });
  }
  next();
};

/**
 * Customer only - requires customer role (students)
 */
exports.customerOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role !== "customer") {
    return res.status(403).json({ 
      message: "Forbidden: Customer access required",
      userRole: req.user.role 
    });
  }
  next();
};

/**
 * Customer or Staff - allows customers and staff (but not just admins viewing as staff)
 */
exports.customerOrStaff = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!["customer", "staff", "admin"].includes(req.user.role)) {
    return res.status(403).json({ 
      message: "Forbidden: Customer or Staff access required",
      userRole: req.user.role 
    });
  }
  next();
};

/**
 * Allow multiple specific roles
 * Usage: allowRoles("admin", "staff")
 */
exports.allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: Requires one of these roles: ${allowedRoles.join(", ")}`,
        userRole: req.user.role,
        allowedRoles 
      });
    }
    next();
  };
};

/**
 * Deny specific role(s)
 * Usage: denyRoles("customer")
 */
exports.denyRoles = (...deniedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (deniedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: Your role (${req.user.role}) cannot access this resource`,
      });
    }
    next();
  };
};
