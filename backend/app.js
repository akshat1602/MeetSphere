import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { connectToSocket } from "./controllers/socketManager.js";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

// Use env PORT if present (Render), otherwise 8080 (local)
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// Routes
app.use("/api/v1/users", userRoutes);

const start = async () => {
  try {
    const connectionDB = await mongoose.connect(
      "mongodb://trivediakshat02_db_user:UP1834@akt@ac-kx1ee1c-shard-00-00.rio1pta.mongodb.net:27017,ac-kx1ee1c-shard-00-01.rio1pta.mongodb.net:27017,ac-kx1ee1c-shard-00-02.rio1pta.mongodb.net:27017/?ssl=true&replicaSet=atlas-morp4a-shard-0&authSource=admin&appName=Cluster0"
    );

    console.log(`MONGO connected DB host : ${connectionDB.connection.host}`);

    server.listen(PORT, () => {
      console.log(`Listening on port ${PORT}`);
    });
  } catch (e) {
    console.error("Failed to start server:", e);
  }
};

start();