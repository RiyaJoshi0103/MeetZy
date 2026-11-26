import { Server } from "socket.io";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import { ChatMessage } from "../models/chat.model.js";

const connections = {};
const timeOnline = {};

function extractRoomCode(path) {
    if (!path) return "";
    try {
        const clean = path.trim().split("?")[0].split("#")[0];
        const segments = clean.split("/").filter(Boolean);
        return (segments[segments.length - 1] || "").toUpperCase();
    } catch (e) {
        return path.toUpperCase();
    }
}

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true,
        },
    });

    // Socket.IO authentication middleware using existing token system
    io.use(async (socket, next) => {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.token ||
            socket.handshake.query?.token;

        if (!token || typeof token !== "string" || !token.trim()) {
            return next(new Error("Authentication error: Session token required"));
        }

        try {
            const user = await User.findOne({ token: token.trim() });
            if (!user) {
                return next(new Error("Authentication error: Invalid or expired token"));
            }

            // Enforce token expiration
            if (user.tokenExpires && user.tokenExpires < new Date()) {
                return next(
                    new Error(
                        "Authentication error: Session token has expired. Please log in again."
                    )
                );
            }

            // Attach authenticated user identity to socket
            socket.user = {
                id: user._id,
                username: user.username,
                name: user.name,
            };
            next();
        } catch (err) {
            return next(new Error("Authentication error: Database validation error"));
        }
    });

    io.on("connection", (socket) => {
        // Handle joining call with room existence validation
        socket.on("join-call", async (path) => {
            const roomCode = extractRoomCode(path);

            if (!roomCode) {
                socket.emit("join-error", { message: "Invalid meeting code format" });
                return;
            }

            try {
                // Validate that the meeting actually exists in the database
                const meeting = await Meeting.findOne({ meetingCode: roomCode });
                if (!meeting) {
                    socket.emit("join-error", {
                        message: `Meeting room "${roomCode}" does not exist. Please create or verify the meeting first.`,
                    });
                    return;
                }

                if (!connections[roomCode]) {
                    connections[roomCode] = [];
                }

                if (!connections[roomCode].includes(socket.id)) {
                    connections[roomCode].push(socket.id);
                }

                timeOnline[socket.id] = new Date();

                // Notify all users in this room of the new participant
                for (let a = 0; a < connections[roomCode].length; a++) {
                    io.to(connections[roomCode][a]).emit(
                        "user-joined",
                        socket.id,
                        connections[roomCode]
                    );
                }

                // Send past room chat messages from MongoDB to this newly joined participant
                try {
                    const pastMessages = await ChatMessage.find({ meetingCode: roomCode })
                        .sort({ timestamp: 1 })
                        .limit(100);

                    pastMessages.forEach((msg) => {
                        socket.emit(
                            "chat-message",
                            msg.message,
                            msg.sender,
                            null,
                            msg.timestamp
                        );
                    });
                } catch (dbErr) {
                    console.error("Error retrieving past chat messages:", dbErr);
                }
            } catch (err) {
                socket.emit("join-error", { message: "Server error validating room" });
            }
        });

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        // Chat message: validated, verified sender, and persisted to MongoDB with 30-day TTL
        socket.on("chat-message", async (data) => {
            if (!data || typeof data !== "string" || !data.trim()) return;

            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                },
                ["", false]
            );

            if (found && matchingRoom) {
                const sender = socket.user?.username || "Anonymous";
                const cleanMessage = data.trim();

                try {
                    const savedMessage = await ChatMessage.create({
                        meetingCode: matchingRoom,
                        sender: sender,
                        message: cleanMessage,
                        timestamp: new Date(),
                    });

                    // Broadcast to all active sockets in this meeting room
                    connections[matchingRoom].forEach((elem) => {
                        io.to(elem).emit(
                            "chat-message",
                            savedMessage.message,
                            savedMessage.sender,
                            socket.id,
                            savedMessage.timestamp
                        );
                    });
                } catch (saveErr) {
                    console.error("Error persisting chat message:", saveErr);
                }
            }
        });

        socket.on("disconnect", () => {
            let key = null;

            for (const [k, v] of Object.entries(connections)) {
                const index = v.indexOf(socket.id);
                if (index !== -1) {
                    key = k;
                    v.splice(index, 1);

                    // Notify remaining users that participant left
                    for (let a = 0; a < v.length; ++a) {
                        io.to(v[a]).emit("user-left", socket.id);
                    }

                    if (v.length === 0) {
                        delete connections[key];
                    }
                    break;
                }
            }

            delete timeOnline[socket.id];
        });
    });

    return io;
};
