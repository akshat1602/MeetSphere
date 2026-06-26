import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnLine = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("SOMETHING CONNECTED", socket.id);

    socket.on("join-call", (roomId) => {
      if (!roomId) return;

      socket.join(roomId);
      socket.roomId = roomId;

      if (!connections[roomId]) {
        connections[roomId] = [];
      }

      if (!connections[roomId].includes(socket.id)) {
        connections[roomId].push(socket.id);
      }

      timeOnLine[socket.id] = new Date();

      io.to(roomId).emit("user-joined", socket.id, connections[roomId]);

      if (messages[roomId]) {
        messages[roomId].forEach((message) => {
          io.to(socket.id).emit(
            "chat-message",
            message.data,
            message.sender,
            message["socket-id-sender"]
          );
        });
      }
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      const roomId = socket.roomId;
      if (!roomId) return;

      if (!messages[roomId]) {
        messages[roomId] = [];
      }

      const messageData = {
        sender,
        data,
        "socket-id-sender": socket.id,
      };

      messages[roomId].push(messageData);

      io.to(roomId).emit("chat-message", data, sender, socket.id);
    });

    socket.on("disconnect", () => {
      const roomId = socket.roomId;

      if (roomId && connections[roomId]) {
        connections[roomId] = connections[roomId].filter((id) => id !== socket.id);

        io.to(roomId).emit("user-left", socket.id);

        if (connections[roomId].length === 0) {
          delete connections[roomId];
          delete messages[roomId];
        }
      }

      delete timeOnLine[socket.id];
      console.log("DISCONNECTED", socket.id);
    });
  });

  return io;
};