import httpStatus from "http-status";
import { MeetingNotes } from "../models/notes.model.js";
import { Transcript } from "../models/transcript.model.js";
import { validateUserSession } from "./user.controller.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8001";

/**
 * Generate structured meeting notes (summary, decisions, action items)
 * Calls the AI microservice and saves structured results to MongoDB
 */
export const generateMeetingNotes = async (req, res) => {
    const session = await validateUserSession(req);
    if (session.error) {
        return res.status(session.status).json({ message: session.error });
    }

    const meetingCode = (req.params.meetingCode || req.body.meetingCode || "").trim().toUpperCase();
    if (!meetingCode) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "meetingCode is required" });
    }

    try {
        // Fetch ordered transcript segments from MongoDB
        const entries = await Transcript.find({ meetingCode })
            .sort({ startTime: 1, timestamp: 1 });

        // Map segments to 1-indexed lines with speaker and timings
        const segmentsPayload = entries.map((entry, index) => ({
            line_number: index + 1,
            speaker: entry.speaker || "Participant",
            text: entry.text || "",
            start_time: entry.startTime || 0,
            end_time: entry.endTime || 0,
        }));

        // Call the AI microservice /generate-notes endpoint
        let aiResult = null;
        try {
            const aiResponse = await fetch(`${AI_SERVICE_URL}/generate-notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meeting_code: meetingCode,
                    segments: segmentsPayload,
                }),
                signal: AbortSignal.timeout(20000), // 20s timeout
            });

            if (aiResponse.ok) {
                aiResult = await aiResponse.json();
            } else {
                console.warn(`[Notes Controller] AI Service returned status ${aiResponse.status}`);
            }
        } catch (aiErr) {
            console.warn(`[Notes Controller] AI Service unreachable (${aiErr.message}), generating rule-based notes.`);
        }

        // Format decisions and action items to match schema
        const decisions = (aiResult?.decisions || []).map((d) => ({
            text: d.text,
            transcriptLine: d.transcript_line || 1,
            speaker: d.speaker || "",
        }));

        const actionItems = (aiResult?.action_items || []).map((a) => ({
            task: a.task,
            owner: a.owner || "Unassigned",
            dueDate: a.due_date || null,
            transcriptLine: a.transcript_line || 1,
            status: a.status || "open",
        }));

        const summary = aiResult?.summary || (
            entries.length > 0
                ? `Meeting ${meetingCode} concluded with ${entries.length} recorded transcript segments.`
                : `Meeting ${meetingCode} concluded. No voice transcript segments were recorded.`
        );

        const keyTopics = aiResult?.key_topics || ["Meeting Review", "Action Items"];
        const sentiment = aiResult?.sentiment || "neutral";
        const totalSegmentsAnalyzed = aiResult?.total_segments_analyzed ?? entries.length;

        // Upsert meeting notes document
        const savedNotes = await MeetingNotes.findOneAndUpdate(
            { meetingCode },
            {
                $set: {
                    summary,
                    keyTopics,
                    decisions,
                    actionItems,
                    sentiment,
                    totalSegmentsAnalyzed,
                    createdBy: session.user.username,
                    updatedAt: new Date(),
                },
                $setOnInsert: {
                    createdAt: new Date(),
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Broadcast to live room participants via Socket.IO if active
        const io = req.app.get("io");
        if (io) {
            io.emit("notes-updated", {
                meetingCode,
                notes: savedNotes,
            });
        }

        return res.status(httpStatus.OK).json({
            message: "Meeting notes generated successfully",
            notes: savedNotes,
        });
    } catch (err) {
        console.error("[Notes Controller] Error:", err);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Failed to generate meeting notes: ${err.message}`,
        });
    }
};

/**
 * Retrieve meeting notes for a given meetingCode
 */
export const getMeetingNotes = async (req, res) => {
    const session = await validateUserSession(req);
    if (session.error) {
        return res.status(session.status).json({ message: session.error });
    }

    const meetingCode = (req.params.meetingCode || "").trim().toUpperCase();
    if (!meetingCode) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "meetingCode is required" });
    }

    try {
        const notes = await MeetingNotes.findOne({ meetingCode });
        if (!notes) {
            return res.status(httpStatus.OK).json({
                meetingCode,
                notes: null,
                message: "No notes generated yet for this meeting",
            });
        }

        return res.status(httpStatus.OK).json({
            meetingCode,
            notes,
        });
    } catch (err) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Failed to retrieve meeting notes: ${err.message}`,
        });
    }
};

/**
 * Update an action item status (open -> in_progress -> completed)
 */
export const updateActionItemStatus = async (req, res) => {
    const session = await validateUserSession(req);
    if (session.error) {
        return res.status(session.status).json({ message: session.error });
    }

    const meetingCode = (req.params.meetingCode || "").trim().toUpperCase();
    const { taskId } = req.params;
    const { status } = req.body;

    const validStatuses = ["open", "in_progress", "completed"];
    if (!validStatuses.includes(status)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: `Status must be one of: ${validStatuses.join(", ")}`,
        });
    }

    try {
        const notes = await MeetingNotes.findOne({ meetingCode });
        if (!notes) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Notes not found for this meeting" });
        }

        const taskIndex = notes.actionItems.findIndex((t) => t.taskId === taskId);
        if (taskIndex === -1) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Action item task not found" });
        }

        notes.actionItems[taskIndex].status = status;
        notes.updatedAt = new Date();
        await notes.save();

        const io = req.app.get("io");
        if (io) {
            io.emit("notes-updated", {
                meetingCode,
                notes,
            });
        }

        return res.status(httpStatus.OK).json({
            message: "Action item status updated successfully",
            actionItems: notes.actionItems,
        });
    } catch (err) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Failed to update action item: ${err.message}`,
        });
    }
};
