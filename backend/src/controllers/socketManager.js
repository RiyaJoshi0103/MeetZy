import { Server } from "socket.io";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import { ChatMessage } from "../models/chat.model.js";
import { Transcript } from "../models/transcript.model.js";
import { processMeetingQuery } from "./qa.controller.js";

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

                // Send past room chat messages to this participant
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

                // Send past room transcripts to this participant
                try {
                    const pastTranscripts = await Transcript.find({ meetingCode: roomCode })
                        .sort({ startTime: 1, timestamp: 1 })
                        .limit(200);

                    socket.emit("transcript-history", pastTranscripts);
                } catch (trErr) {
                    console.error("Error retrieving past transcripts:", trErr);
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

                    // Trigger in-meeting AI assistant if message is directed to @ai, @meetzy, or /ai
                    const lower = cleanMessage.toLowerCase();
                    if (
                        lower.startsWith("@ai ") ||
                        lower.startsWith("@meetzy ") ||
                        lower.startsWith("/ai ") ||
                        lower === "@ai" ||
                        lower === "@meetzy"
                    ) {
                        (async () => {
                            try {
                                const query = cleanMessage
                                    .replace(/^(@ai|@meetzy|\/ai)\s*/i, "")
                                    .trim() || "What were the main topics and decisions discussed so far?";
                                const aiResponse = await processMeetingQuery(matchingRoom, query, sender);
                                
                                let replyText = aiResponse.answer;
                                if (aiResponse.citations && aiResponse.citations.length > 0) {
                                    const citeTags = aiResponse.citations
                                        .map((c) => (c.line_number ? `[Line ${c.line_number}]` : null))
                                        .filter(Boolean)
                                        .join(" ");
                                    if (citeTags) {
                                        replyText += `\n(Sources: ${citeTags})`;
                                    }
                                }

                                const aiMessage = await ChatMessage.create({
                                    meetingCode: matchingRoom,
                                    sender: "Meetzy AI",
                                    message: replyText,
                                    timestamp: new Date(),
                                });

                                if (connections[matchingRoom]) {
                                    connections[matchingRoom].forEach((elem) => {
                                        io.to(elem).emit(
                                            "chat-message",
                                            aiMessage.message,
                                            aiMessage.sender,
                                            "meetzy-ai-agent",
                                            aiMessage.timestamp
                                        );
                                    });
                                }
                            } catch (botErr) {
                                console.error("Error running AI in-meeting agent:", botErr);
                            }
                        })();
                    }
                } catch (saveErr) {
                    console.error("Error persisting chat message:", saveErr);
                }
            }
        });

        // Audio chunk listener: processes chunk, transcribes via AI service, and stores speaker transcript
        socket.on("audio-chunk", async (chunkData) => {
            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                },
                ["", false]
            );

            if (!found || !matchingRoom) return;

            const speaker = socket.user?.username || "Anonymous";
            let transcribedText = chunkData?.text || "";

            const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8001";

            // If audioBase64 was provided, forward to AI microservice
            if (!transcribedText && chunkData?.audioBase64) {
                try {
                    const res = await fetch(`${aiServiceUrl}/transcribe`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            meeting_code: matchingRoom,
                            speaker: speaker,
                            audio_base64: chunkData.audioBase64,
                            start_time: Number(chunkData.startTime || 0),
                            end_time: Number(chunkData.endTime || 0),
                        }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        transcribedText = data.text;
                    }
                } catch (err) {
                    // Microservice offline fallback placeholder
                    transcribedText = `[${speaker} speech: ${Number(chunkData.startTime || 0).toFixed(1)}s - ${Number(chunkData.endTime || 0).toFixed(1)}s]`;
                }
            }

            if (transcribedText && transcribedText.trim()) {
                try {
                    const savedEntry = await Transcript.create({
                        meetingCode: matchingRoom,
                        speaker: speaker,
                        text: transcribedText.trim(),
                        startTime: Number(chunkData?.startTime || 0),
                        endTime: Number(chunkData?.endTime || 0),
                        timestamp: new Date(),
                    });

                    // Broadcast transcript line in real time to all room participants
                    connections[matchingRoom].forEach((elem) => {
                        io.to(elem).emit("transcript-update", {
                            id: savedEntry._id,
                            meetingCode: matchingRoom,
                            speaker: savedEntry.speaker,
                            text: savedEntry.text,
                            startTime: savedEntry.startTime,
                            endTime: savedEntry.endTime,
                            timestamp: savedEntry.timestamp,
                        });
                    });
                } catch (err) {
                    console.error("Error saving transcript segment:", err);
                }
            }
        });

        // Clear meeting transcript (for privacy / GDPR deletion)
        socket.on("transcript-clear", async () => {
            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                },
                ["", false]
            );

            if (!found || !matchingRoom) return;

            try {
                await Transcript.deleteMany({ meetingCode: matchingRoom });
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("transcript-cleared");
                });
            } catch (err) {
                console.error("Error clearing transcript:", err);
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
