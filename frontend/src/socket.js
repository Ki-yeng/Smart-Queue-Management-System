// src/socket.js
import { io } from "socket.io-client";

const rawSocketBase = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "http://localhost:5000";
const socketBaseUrl = rawSocketBase.replace(/\/api\/?$/, "").replace(/\/$/, "");

export const socket = io(socketBaseUrl, {
  autoConnect: false,
  withCredentials: true,
  timeout: 10000,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 20,
  transports: ["websocket", "polling"],
  upgrade: true,
});

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected. Reason:", reason);
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error?.message || error);
});

socket.on("error", (error) => {
  console.error("Socket error:", error?.message || error);
});
