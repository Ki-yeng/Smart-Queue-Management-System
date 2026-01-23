// src/index.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { startLoadBalancingMonitor } = require("./utils/loadBalancer");
const socketEvents = require("./utils/socketEvents");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: "http://localhost:5173", // Vite
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/tickets", require("./routes/ticketRoutes"));
app.use("/api/counters", require("./routes/counterRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/products", require("./routes/products"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/load-balance", require("./routes/loadBalancingRoutes"));
app.use("/api/health", require("./routes/healthRoutes"));
app.use("/api/integrations", require("./routes/integrationRoutes"));

// Test routes
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

/**
 * Socket.IO Configuration
 * Real-time bidirectional communication for:
 * - Ticket status updates
 * - Queue notifications
 * - Counter assignments
 * - Dashboard updates
 */

let io;

try {
  // Initialize Socket.IO with production-ready options
  io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_IO_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    transports: ["websocket", "polling"],
    
    // Connection management
    pingInterval: 25000,        // Send ping every 25 seconds
    pingTimeout: 20000,         // Wait 20 seconds for pong response
    maxHttpBufferSize: 1000000, // 1MB max message size
    
    // Reconnection settings
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    
    // Performance tuning
    serveClient: true,
    upgradeTimeout: 10000,
  });

  /**
   * Track connected clients for monitoring
   */
  const connectedClients = new Map();
  let clientCounter = 0;

  /**
   * Socket.IO Connection Handler
   */
  io.on("connection", (socket) => {
    clientCounter++;
    const clientId = clientCounter;
    connectedClients.set(socket.id, {
      id: socket.id,
      clientId,
      connectedAt: new Date(),
      rooms: new Set(),
    });

    console.log(
      `🟢 Socket connected [${clientId}]:`,
      socket.id,
      `(Total: ${connectedClients.size})`
    );

    // Emit acknowledgment to client
    socket.emit("connected", {
      socketId: socket.id,
      clientId,
      timestamp: new Date(),
      message: "Connected to queue management server",
    });

    /**
     * Room Management Events
     */

    // Join dashboard (staff monitoring)
    socket.on("joinDashboard", (data = {}, callback) => {
      socket.join("dashboard");
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.rooms.add("dashboard");
        clientInfo.userRole = data.userRole || "admin";
        clientInfo.userId = data.userId;
      }
      
      console.log(`📊 [${clientId}] Joined dashboard room (Total: ${io.sockets.adapter.rooms.get("dashboard")?.size || 0})`);
      
      if (typeof callback === "function") {
        callback({ success: true, room: "dashboard" });
      }

      // Notify dashboard users of new connection
      io.to("dashboard").emit("staffConnectionUpdate", {
        action: "connected",
        clientId,
        timestamp: new Date(),
        totalConnected: connectedClients.size,
      });
    });

    // Join service-specific queue
    socket.on("joinServiceQueue", (data, callback) => {
      const { serviceType } = data;
      if (!serviceType) {
        if (typeof callback === "function") {
          callback({ success: false, error: "serviceType is required" });
        }
        return;
      }

      socket.join(`service-${serviceType}`);
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.rooms.add(`service-${serviceType}`);
        clientInfo.serviceType = serviceType;
      }

      console.log(
        `📍 [${clientId}] Joined service queue: ${serviceType} (Total: ${io.sockets.adapter.rooms.get(`service-${serviceType}`)?.size || 0})`
      );

      if (typeof callback === "function") {
        callback({ success: true, room: `service-${serviceType}` });
      }

      // Notify others in service queue
      io.to(`service-${serviceType}`).emit("queueUserJoined", {
        serviceType,
        clientId,
        timestamp: new Date(),
      });
    });

    // Join counter-specific room
    socket.on("joinCounter", (data, callback) => {
      const { counterId } = data;
      if (!counterId) {
        if (typeof callback === "function") {
          callback({ success: false, error: "counterId is required" });
        }
        return;
      }

      socket.join(`counter-${counterId}`);
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.rooms.add(`counter-${counterId}`);
        clientInfo.counterId = counterId;
      }

      console.log(
        `🏪 [${clientId}] Joined counter room: ${counterId} (Total: ${io.sockets.adapter.rooms.get(`counter-${counterId}`)?.size || 0})`
      );

      if (typeof callback === "function") {
        callback({ success: true, room: `counter-${counterId}` });
      }
    });

    // Join user-specific room for personal notifications
    socket.on("joinUserRoom", (data, callback) => {
      const { userId } = data;
      if (!userId) {
        if (typeof callback === "function") {
          callback({ success: false, error: "userId is required" });
        }
        return;
      }

      socket.join(`user-${userId}`);
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.rooms.add(`user-${userId}`);
        clientInfo.userId = userId;
      }

      console.log(
        `👤 [${clientId}] Joined user room: ${userId}`
      );

      if (typeof callback === "function") {
        callback({ success: true, room: `user-${userId}` });
      }
    });

    // Leave specific room
    socket.on("leaveRoom", (data, callback) => {
      const { room } = data;
      if (!room) {
        if (typeof callback === "function") {
          callback({ success: false, error: "room is required" });
        }
        return;
      }

      socket.leave(room);
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.rooms.delete(room);
      }

      console.log(`✌️  [${clientId}] Left room: ${room}`);

      if (typeof callback === "function") {
        callback({ success: true, room });
      }
    });

    /**
     * Heartbeat/Ping Events
     */

    socket.on("ping", (callback) => {
      if (typeof callback === "function") {
        callback({
          pong: true,
          timestamp: new Date(),
          serverTime: Date.now(),
        });
      }
    });

    /**
     * Connection Event Handlers
     */

    // Initial connection - staff joining
    socket.on("staffConnected", (data = {}, callback) => {
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.staffId = data.staffId;
        clientInfo.staffName = data.staffName;
        clientInfo.staffRole = data.staffRole;
        clientInfo.counterId = data.counterId;
        clientInfo.connectedType = "staff";
        clientInfo.loginTime = new Date();
      }

      console.log(
        `👔 [${clientId}] Staff connected: ${data.staffName} (Role: ${data.staffRole})`
      );

      if (typeof callback === "function") {
        callback({ success: true, clientId, message: "Staff logged in" });
      }

      // Notify dashboard of staff login
      io.to("dashboard").emit("staffLoggedIn", {
        clientId,
        staffId: data.staffId,
        staffName: data.staffName,
        staffRole: data.staffRole,
        counterId: data.counterId,
        timestamp: new Date(),
        message: `${data.staffName} logged in`,
      });

      // Broadcast to all
      io.emit("staffStatusUpdated", {
        action: "logged_in",
        staffName: data.staffName,
        staffRole: data.staffRole,
        timestamp: new Date(),
        totalOnline: connectedClients.size,
      });
    });

    // Student joining queue
    socket.on("studentConnected", (data = {}, callback) => {
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.studentId = data.studentId;
        clientInfo.studentName = data.studentName;
        clientInfo.email = data.email;
        clientInfo.connectedType = "student";
        clientInfo.loginTime = new Date();
      }

      console.log(
        `🎓 [${clientId}] Student connected: ${data.studentName}`
      );

      if (typeof callback === "function") {
        callback({ success: true, clientId, message: "Connected to queue" });
      }

      // Notify dashboard of student login
      io.to("dashboard").emit("studentLoggedIn", {
        clientId,
        studentId: data.studentId,
        studentName: data.studentName,
        email: data.email,
        timestamp: new Date(),
        message: `${data.studentName} joined queue`,
      });
    });

    /**
     * Enhanced Disconnection Handler
     */

    socket.on("disconnect", (reason) => {
      const clientInfo = connectedClients.get(socket.id);
      
      if (!clientInfo) return; // Already deleted

      connectedClients.delete(socket.id);

      console.log(
        `🔴 Socket disconnected [${clientId}]:`,
        socket.id,
        `| Reason: ${reason} | Remaining: ${connectedClients.size}`
      );

      // Handle staff disconnection
      if (clientInfo.connectedType === "staff") {
        console.log(
          `👔 [${clientId}] Staff disconnected: ${clientInfo.staffName} (${clientInfo.staffRole})`
        );

        // Notify dashboard of staff logout
        io.to("dashboard").emit("staffLoggedOut", {
          clientId,
          staffId: clientInfo.staffId,
          staffName: clientInfo.staffName,
          staffRole: clientInfo.staffRole,
          counterId: clientInfo.counterId,
          reason,
          disconnectTime: new Date(),
          message: `${clientInfo.staffName} logged out`,
        });

        // Notify counter room
        if (clientInfo.counterId) {
          io.to(`counter-${clientInfo.counterId}`).emit("staffDisconnected", {
            staffName: clientInfo.staffName,
            counterId: clientInfo.counterId,
            reason,
            timestamp: new Date(),
          });
        }

        // Broadcast to all
        io.emit("staffStatusUpdated", {
          action: "logged_out",
          staffName: clientInfo.staffName,
          staffRole: clientInfo.staffRole,
          timestamp: new Date(),
          totalOnline: connectedClients.size,
        });
      }

      // Handle student disconnection
      if (clientInfo.connectedType === "student") {
        console.log(
          `🎓 [${clientId}] Student disconnected: ${clientInfo.studentName}`
        );

        // Notify dashboard of student logout
        io.to("dashboard").emit("studentLoggedOut", {
          clientId,
          studentId: clientInfo.studentId,
          studentName: clientInfo.studentName,
          reason,
          disconnectTime: new Date(),
        });
      }

      // Notify dashboard if was in dashboard room
      if (clientInfo.rooms.has("dashboard")) {
        io.to("dashboard").emit("staffConnectionUpdate", {
          action: "disconnected",
          clientId,
          reason,
          timestamp: new Date(),
          totalConnected: connectedClients.size,
        });
      }

      // Notify service queues of disconnection
      clientInfo.rooms.forEach((room) => {
        if (room.startsWith("service-")) {
          io.to(room).emit("staffDisconnected", {
            clientId,
            reason,
            timestamp: new Date(),
          });
        }
      });
    });

    /**
     * Graceful Disconnection Handler
     */

    socket.on("staffDisconnecting", (data = {}, callback) => {
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.disconnectReason = data.reason || "Manual logout";
      }

      console.log(`👋 [${clientId}] Staff initiating disconnect: ${data.reason}`);

      if (typeof callback === "function") {
        callback({ success: true, message: "Logout initiated" });
      }

      // Notify others
      io.to("dashboard").emit("staffDisconnecting", {
        clientId,
        staffName: clientInfo?.staffName,
        reason: data.reason,
        timestamp: new Date(),
      });
    });

    /**
     * Error Handler
     */

    socket.on("error", (error) => {
      const clientInfo = connectedClients.get(socket.id);
      console.error(`❌ Socket error [${clientId}]:`, error);
      
      // Notify dashboard of critical errors
      if (clientInfo && clientInfo.rooms.has("dashboard")) {
        io.to("dashboard").emit("socketError", {
          clientId,
          error: error.message,
          timestamp: new Date(),
          socketId: socket.id,
        });
      }
    });

    /**
     * Client-side error reporting
     */

    socket.on("clientError", (data) => {
      const clientInfo = connectedClients.get(socket.id);
      console.error(`⚠️  Client error [${clientId}]:`, data.message, data.stack);
      
      // Log critical client errors to dashboard
      if (clientInfo && data.severity === "critical") {
        io.to("dashboard").emit("clientErrorReport", {
          clientId,
          clientName: clientInfo.staffName || clientInfo.studentName,
          error: data.message,
          stack: data.stack,
          severity: data.severity,
          timestamp: new Date(),
        });
      }
    });

    /**
     * Client Info Logging
     */

    socket.on("clientInfo", (data) => {
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.userAgent = data.userAgent;
        clientInfo.language = data.language;
        clientInfo.timezone = data.timezone;
        clientInfo.screenResolution = data.screenResolution;
      }
      console.log(`ℹ️  Client info [${clientId}]:`, {
        userAgent: data.userAgent?.substring(0, 50),
        language: data.language,
        timezone: data.timezone,
      });
    });

    /**
     * Session Keep-Alive
     */

    socket.on("keepAlive", (callback) => {
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.lastActivity = new Date();
      }

      if (typeof callback === "function") {
        callback({
          alive: true,
          timestamp: new Date(),
          serverTime: Date.now(),
        });
      }
    });

    /**
     * Activity Tracking
     */

    socket.on("activityUpdate", (data) => {
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.lastActivity = new Date();
        clientInfo.currentActivity = data.activity;
      }

      console.log(`🔄 [${clientId}] Activity: ${data.activity}`);
    });
  });

  // Expose io instance to routes via app
  app.set("io", io);

  /**
   * Expose socketEvents helper functions
   * This allows controllers and routes to emit events
   */
  app.set("socketEvents", socketEvents);

  /**
   * Add utility function to broadcast to all connected clients
   */
  app.set("broadcastToAll", (event, data) => {
    if (io) {
      io.emit(event, {
        ...data,
        timestamp: new Date(),
        connectedClients: connectedClients.size,
      });
    }
  });

  /**
   * Add utility function to get connected clients count
   */
  app.set("getConnectedClientsCount", () => {
    return connectedClients.size;
  });

  /**
   * Get client info utility
   */
  app.set("getClientInfo", (socketId) => {
    return connectedClients.get(socketId);
  });

  console.log("✅ Socket.IO initialized successfully");

  /**
   * Start Real-Time Load Balancing Monitor
   * Emits metrics every 10 seconds to all connected clients
   */
  try {
    startLoadBalancingMonitor(io, 10000);
    console.log(
      "📊 Load balancing monitor started (broadcasts every 10 seconds)"
    );
  } catch (err) {
    console.error("⚠️  Load balancing monitor failed:", err.message);
  }

} catch (err) {
  console.error("❌ Socket.IO initialization failed:", err.message);
  console.error("Stack:", err.stack);
  // Continue running app even if Socket.IO fails
  console.log("ℹ️  App will continue running without real-time features");
}

// Start server (ONLY ONCE)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
