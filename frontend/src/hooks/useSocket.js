import { useEffect, useRef } from "react";
import { socket } from "../socket";

/**
 * Custom hook for managing Socket.IO connection lifecycle
 * Ensures socket is connected when component mounts and disconnected when unmounts
 * Prevents multiple rapid connections/disconnections from re-renders
 */
export const useSocket = () => {
  const isConnectedRef = useRef(false);

  useEffect(() => {
    // Only connect if not already connected
    if (!socket.connected && !isConnectedRef.current) {
      socket.connect();
      isConnectedRef.current = true;
      console.log("🔌 Socket connection initiated");
    }

    // Cleanup: disconnect on unmount
    return () => {
      if (socket.connected) {
        socket.disconnect();
        isConnectedRef.current = false;
        console.log("🔌 Socket disconnected on unmount");
      }
    };
  }, []);

  return socket;
};
