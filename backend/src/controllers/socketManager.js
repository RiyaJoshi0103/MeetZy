import { Server } from "socket.io";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";

const connections = {};
const messages = {};
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
                return next(new Error("Authentication error: Session token has expired. Please log in again."));
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

                // Send past room chat messages to this participant
                if (messages[roomCode] !== undefined) {
                    for (let a = 0; a < messages[roomCode].length; ++a) {
                        io.to(socket.id).emit(
                            "chat-message",
                            messages[roomCode][a].data,
                            messages[roomCode][a].sender,
                            messages[roomCode][a]["socket-id-sender"]
                        );
                    }
                }
            } catch (err) {
                socket.emit("join-error", { message: "Server error validating room" });
            }
        });

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        // Chat message uses verified socket.user.username - sender cannot be spoofed!
        socket.on("chat-message", (data) => {
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
                if (!messages[matchingRoom]) {
                    messages[matchingRoom] = [];
                }

                // Verified sender username from authenticated socket session
                const sender = socket.user?.username || "Anonymous";

                messages[matchingRoom].push({
                    sender: sender,
                    data: data,
                    "socket-id-sender": socket.id,
                    timestamp: new Date(),
                });

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id);
                });
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
