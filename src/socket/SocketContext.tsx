
import React, { createContext, useEffect, useState, ReactNode } from "react";
import socket from "./config";

// TypeScript interface for the context value
interface SocketContextType {
  socket: any | null;
}

// Create a socket context
export const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socketInstance, setSocketInstance] = useState<any | null>(null);

  useEffect(() => {
    // Connect socket on mount
    setSocketInstance(socket);
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      // Disconnect on unmount
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketInstance }}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the socket
export const useSocket = () => {
  const context = React.useContext(SocketContext);
  if (context === undefined) {
    return null; // Return null if not in provider
  }
  return context.socket;
};
