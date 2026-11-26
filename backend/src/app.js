import express from "express";
import { createServer } from "node:http";

import { Server } from "socket.io";

import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";

import cors from "cors";
import userRoutes from "./routes/users.routes.js";

// Native .env loader with graceful fallback
if (typeof process.loadEnvFile === "function") {
    try {
        process.loadEnvFile();
    } catch (e) {
        // .env file is optional if env vars are supplied by host
    }
} else {
    try {
        const dotenv = await import("dotenv");
        dotenv.default?.config?.();
    } catch (e) {}
}

const app = express();
const server = createServer(app);
const io = connectToSocket(server);


app.set("port", (process.env.PORT || 8000))
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

const start = async () => {
    let mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        console.warn("[Database] MONGO_URI is not set in environment.");
        console.log("[Database] Initializing in-memory MongoDB instance for local development...");
        try {
            const { MongoMemoryServer } = await import("mongodb-memory-server");
            const fs = await import("fs");
            const path = await import("path");
            const dataDir = path.resolve("./.mongo_data");
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            const mongod = await MongoMemoryServer.create({
                instance: {
                    dbPath: dataDir,
                    storageEngine: "wiredTiger",
                },
            });
            mongoUri = mongod.getUri();
            console.log(`[Database] Persistent MongoDB active at: ${mongoUri}`);
        } catch (e) {
            console.error("[Database] Failed to launch MongoMemoryServer:", e.message);
            throw new Error("MONGO_URI environment variable is required to start the server.");
        }
    }

    const connectionDb = await mongoose.connect(mongoUri);
    console.log(`[Database] MongoDB connected successfully: ${connectionDb.connection.host}`);

    server.listen(app.get("port"), () => {
        console.log(`[Server] Meetzy Backend listening on port ${app.get("port")}`);
    });
};



start();