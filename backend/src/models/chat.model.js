import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema(
    {
        meetingCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        sender: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
            expires: "30d", // MongoDB TTL index: automatically purges records after 30 days
        },
    },
    { versionKey: false }
);

const ChatMessage = mongoose.model("ChatMessage", chatSchema);

export { ChatMessage };
