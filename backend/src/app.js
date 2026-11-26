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
    app.set("mongo_user")
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error("MONGO_URI environment variable is not defined");
    }
    const connectionDb = await mongoose.connect(mongoUri);

    console.log(`MONGO Connected DB HOst: ${connectionDb.connection.host}`)
    server.listen(app.get("port"), () => {
        console.log("LISTENIN ON PORT 8000")
    });



}



start();