// src/socket.js
import { io } from "socket.io-client";

export const socket = io("http://localhost:5000", {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ["websocket", "polling"],
  upgrade: true,
});

// Connection event handlers
socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("⚠️ Socket disconnected. Reason:", reason);
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket connection error:", error);
});

socket.on("error", (error) => {
  console.error("❌ Socket error:", error);
});
