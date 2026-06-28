import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnLine = {};
let socketRoomMap = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("SOMETHING CONNECTED:", socket.id);

    socket.on("join-call", (path) => {
      if (!path) return;

      if (!connections[path]) {
        connections[path] = [];
      }

      const alreadyJoined = connections[path].includes(socket.id);

      if (!alreadyJoined) {
        connections[path].push(socket.id);
      }

      socketRoomMap[socket.id] = path;
      timeOnLine[socket.id] = new Date();
      socket.join(path);

      for (let i = 0; i < connections[path].length; i++) {
        io.to(connections[path][i]).emit("user-joined", socket.id, connections[path]);
      }

      if (messages[path]) {
        for (let i = 0; i < messages[path].length; i++) {
          io.to(socket.id).emit(
            "chat-message",
            messages[path][i].data,
            messages[path][i].sender,
            messages[path][i]["socket-id-sender"]
          );
        }
      }
    });

    socket.on("signal", (told, message) => {
      io.to(told).emit("signal", socket.id, message);
    });

    socket.on("media-state-change", (payload = {}) => {
      const roomId = socketRoomMap[socket.id] || payload.roomId;
      if (!roomId) return;

      socket.to(roomId).emit("media-state-changed", {
        socketId: socket.id,
        username: payload.username || "Guest",
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

      console.log("message:", sender, data);

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
        connections[roomId].forEach((id) => {
          io.to(id).emit("user-left", socket.id);
        });

        connections[roomId] = connections[roomId].filter((id) => id !== socket.id);

        if (connections[roomId].length === 0) {
          delete connections[roomId];
          delete messages[roomId];
        }
      }

      delete socketRoomMap[socket.id];
      delete timeOnLine[socket.id];

      console.log(`Socket disconnected: ${socket.id}, duration: ${diffTime}ms`);
    });
  });

  return io;
};