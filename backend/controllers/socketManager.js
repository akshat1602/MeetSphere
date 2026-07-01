import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnLine = {};
let socketRoomMap = {};
let socketUserMap = {};

const normalizeRoomCode = (value = "") => value.trim().toUpperCase();

export const connectToSocket = (server, allowedOrigins = []) => {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("SOCKET CONNECTED:", socket.id, "origin:", socket.handshake.headers.origin);

    socket.on("join-call", (roomCode, callback) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);

      if (!normalizedRoomCode) {
        return callback?.({ ok: false, message: "Invalid room code" });
      }

      if (!connections[normalizedRoomCode]) {
        connections[normalizedRoomCode] = [];
      }

      const alreadyJoined = connections[normalizedRoomCode].includes(socket.id);

      if (!alreadyJoined) {
        connections[normalizedRoomCode].push(socket.id);
      }

      socketRoomMap[socket.id] = normalizedRoomCode;
      timeOnLine[socket.id] = new Date();
      socket.join(normalizedRoomCode);

      callback?.({
        ok: true,
        roomCode: normalizedRoomCode,
        participants: connections[normalizedRoomCode],
      });

      io.to(normalizedRoomCode).emit("user-joined", socket.id, connections[normalizedRoomCode]);
    });

    socket.on("register-user", ({ username }) => {
      socketUserMap[socket.id] = username || "Guest";
    });

    socket.on("signal", (targetId, message) => {
      io.to(targetId).emit("signal", socket.id, message);
    });

    socket.on("media-state-change", (payload = {}) => {
      const roomId = socketRoomMap[socket.id] || normalizeRoomCode(payload.roomId || "");
      if (!roomId) return;

      if (payload.username) {
        socketUserMap[socket.id] = payload.username;
      }

      socket.to(roomId).emit("media-state-changed", {
        socketId: socket.id,
        username: payload.username || socketUserMap[socket.id] || "Guest",
        videoEnabled:
          typeof payload.videoEnabled === "boolean" ? payload.videoEnabled : true,
        audioEnabled:
          typeof payload.audioEnabled === "boolean" ? payload.audioEnabled : true,
      });
    });

    socket.on("chat-message", (data, sender) => {
      const roomId = socketRoomMap[socket.id];
      if (!roomId) return;

      if (!messages[roomId]) {
        messages[roomId] = [];
      }

      messages[roomId].push({
        sender,
        data,
        "socket-id-sender": socket.id,
      });

      io.to(roomId).emit("chat-message", data, sender, socket.id);
    });

    socket.on("disconnect", () => {
      const joinedAt = timeOnLine[socket.id];
      let diffTime = 0;

      if (joinedAt) {
        diffTime = Math.abs(new Date() - joinedAt);
      }

      const roomId = socketRoomMap[socket.id];

      if (roomId && connections[roomId]) {
        io.to(roomId).emit("user-left", socket.id);

        connections[roomId] = connections[roomId].filter((id) => id !== socket.id);

        if (connections[roomId].length === 0) {
          delete connections[roomId];
          delete messages[roomId];
        }
      }

      delete socketRoomMap[socket.id];
      delete socketUserMap[socket.id];
      delete timeOnLine[socket.id];

      console.log(`Socket disconnected: ${socket.id}, duration: ${diffTime}ms`);
    });
  });

  return io;
};