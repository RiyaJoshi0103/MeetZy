import mongoose, { Schema } from "mongoose";

const transcriptSchema = new Schema(
    {
        meetingCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        speaker: {
            type: String,
            required: true,
            trim: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        startTime: {
            type: Number, // Seconds relative to meeting start
            default: 0,
        },
        endTime: {
            type: Number, // Seconds relative to meeting start
            default: 0,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { versionKey: false }
);

const Transcript = mongoose.model("Transcript", transcriptSchema);

export { Transcript };
