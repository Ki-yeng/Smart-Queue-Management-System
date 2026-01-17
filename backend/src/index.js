// src/index.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: "http://localhost:5173", // Vite
  credentials: true,
}));
app.use(express.json());

// Routes (UNCHANGED)
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/tickets", require("./routes/ticketRoutes"));
app.use("/api/counters", require("./routes/counterRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/products", require("./routes/products"));
app.use("/api/users", require("./routes/userRoutes"));

// Test routes
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.get("/", (req, res) =>
  res.send("Smart Queue Management System Backend is running")
);

// MongoDB
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/kcau-queue";
console.log(`🔗 Connecting to MongoDB: ${mongoUri.replace(/\/\/.*:.*@/, "//***:***@")}`);

mongoose.connect(mongoUri)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("⚠️  Make sure MongoDB is running or check MONGO_URI in .env");
    // Don't exit - allow server to run with fallback
    console.log("ℹ️  Server will continue running (some features may not work)");
  });

// Socket.IO (SAFE INIT)
let io;
try {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // Handle custom events
    socket.on("joinQueue", (data) => {
      socket.join(`queue-${data.serviceType}`);
      console.log(`User joined queue-${data.serviceType}`);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", socket.id, "Reason:", reason);
    });

    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });
  });

  app.set("io", io);
} catch (err) {
  console.error("❌ Socket.IO failed to start:", err.message);
}

// Start server (ONLY ONCE)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
