import { useEffect, useRef } from "react";
import { socket } from "../socket";

/**
 * Custom hook for shared Socket.IO lifecycle.
 * Keeps socket connected across route changes and mounts.
 */
export const useSocket = () => {
  const hasInitiatedRef = useRef(false);

  useEffect(() => {
    if (!socket.connected && !hasInitiatedRef.current) {
      socket.connect();
      hasInitiatedRef.current = true;
      console.log("Socket connection initiated");
    }

    return () => {
      hasInitiatedRef.current = false;
    };
  }, []);

  return socket;
};
