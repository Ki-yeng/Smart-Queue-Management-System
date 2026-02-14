const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Upload = require("../models/Upload");
const { protect, customerOrStaff } = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${unique}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["application/pdf", "image/png", "image/jpeg"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Unsupported file type"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/uploads
router.post("/", protect, customerOrStaff, upload.array("files", 5), async (req, res) => {
  try {
    const { ticketId, category } = req.body || {};
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const docs = await Upload.insertMany(
      files.map((f) => ({
        userId: req.user._id,
        ticketId: ticketId || null,
        originalName: f.originalname,
        filename: f.filename,
        mimeType: f.mimetype,
        size: f.size,
        path: `/uploads/${f.filename}`,
        category: category || "general",
        uploadedBy: req.user._id,
      }))
    );

    res.json({ message: "Files uploaded", files: docs });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "File upload failed" });
  }
});

// GET /api/uploads/user/:userId
router.get("/user/:userId", protect, customerOrStaff, async (req, res) => {
  try {
    const { userId } = req.params;
    const isOwner = req.user?._id?.toString() === userId;
    const isStaff = ["staff", "admin"].includes(req.user?.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const uploads = await Upload.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json({ uploads });
  } catch (err) {
    console.error("Upload fetch error:", err);
    res.status(500).json({ message: "Failed to load uploads" });
  }
});

module.exports = router;
