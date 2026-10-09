import io from "socket.io-client";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.seekids.net";
const socket = io(backendUrl, {
  auth: {
    token: localStorage.getItem("accessToken"),
  },
  transports: ["websocket"],
  autoConnect: false,
});

export default socket;
