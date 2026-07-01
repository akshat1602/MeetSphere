import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import { connectToSocket } from "./controllers/socketManager.js";

const app = express();
const server = createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://meetsphere-frontend-kjop.onrender.com",
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_2,
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    console.log("CORS origin:", origin);

    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("/{*any}", cors(corsOptions));

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({ message: "MeetSphere backend running" });
});

app.use("/api/v1/users", userRoutes);

connectToSocket(server, allowedOrigins);

const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGO_URI;

const start = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is missing in environment variables");
    }

    const connectionDB = await mongoose.connect(MONGO_URI);
    console.log(`MONGO connected DB host: ${connectionDB.connection.host}`);

    server.listen(PORT, () => {
      console.log(`Listening on port ${PORT}`);
      console.log("Allowed origins:", allowedOrigins);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();