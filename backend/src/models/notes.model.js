import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

const decisionSchema = new Schema(
    {
        text: { type: String, required: true },
        transcriptLine: { type: Number, required: true },
        speaker: { type: String, default: "" },
    },
    { _id: false }
);

const actionItemSchema = new Schema(
    {
        taskId: {
            type: String,
            default: () => crypto.randomUUID(),
        },
        task: { type: String, required: true },
        owner: { type: String, default: "Unassigned" },
        dueDate: { type: String, default: null },
        transcriptLine: { type: Number, required: true },
        status: {
            type: String,
            enum: ["open", "in_progress", "completed"],
            default: "open",
        },
    },
    { _id: false }
);

const notesSchema = new Schema(
    {
        meetingCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        summary: {
            type: String,
            required: true,
        },
        keyTopics: {
            type: [String],
            default: [],
        },
        decisions: {
            type: [decisionSchema],
            default: [],
        },
        actionItems: {
            type: [actionItemSchema],
            default: [],
        },
        sentiment: {
            type: String,
            enum: ["positive", "neutral", "constructive", "mixed"],
            default: "neutral",
        },
        totalSegmentsAnalyzed: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: String,
            default: "system",
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { versionKey: false }
);

const MeetingNotes = mongoose.model("MeetingNotes", notesSchema);

export { MeetingNotes };
