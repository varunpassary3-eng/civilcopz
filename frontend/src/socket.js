import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true
});

export const connectSocket = (caseId) => {
  if (!socket.connected) {
    socket.connect();
  }
  
  if (caseId) {
    socket.emit("join_case", caseId);
    console.log(`[SOCKET] Joining room for case: ${caseId}`);
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const onCaseUpdate = (callback) => {
  socket.on("caseUpdate", callback);
};

export const offCaseUpdate = () => {
  socket.off("caseUpdate");
};

export default socket;
