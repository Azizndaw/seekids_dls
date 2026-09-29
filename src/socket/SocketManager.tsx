import React, { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/socket/SocketContext";

/**
 * Ce composant invisible gère la connexion aux "rooms" Socket.IO
 * Il doit être placé à l'intérieur du SocketProvider et après le chargement de l'auth.
 */
const SocketManager = () => {
    const { socket } = useSocket() || {};
    const { authUser } = useAuth();

    useEffect(() => {
        if (!socket) return;
        if (!authUser?.id) return;

        // Dès qu'on a un user et une socket, on rejoint sa "room" personnelle
        console.log(`🔌 SocketManager: Joining room for user ${authUser.id}`);
        socket.emit("join_room", authUser.id);

        // Optionnel : gérer la reconnexion
        const handleConnect = () => {
            console.log("🔌 Socket connected, joining room...");
            socket.emit("join_room", authUser.id);
        };

        socket.on("connect", handleConnect);

        return () => {
            socket.off("connect", handleConnect);
        };
    }, [socket, authUser?.id]);

    return null; // Composant utilitaire sans rendu visuel
};

export default SocketManager;
