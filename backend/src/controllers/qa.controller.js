import httpStatus from "http-status";
import { Transcript } from "../models/transcript.model.js";
import { MeetingNotes } from "../models/notes.model.js";
import { validateUserSession } from "./user.controller.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8001";

/**
 * REST Endpoint: Query meeting transcript & notes memory using RAG agent
 */
export const queryMeetingQA = async (req, res) => {
    const session = await validateUserSession(req);
    if (session.error) {
        return res.status(session.status).json({ message: session.error });
    }

    const meetingCode = (req.params.meetingCode || req.body.meetingCode || "").trim().toUpperCase();
    const question = (req.body.question || "").trim();

    if (!meetingCode) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "meetingCode is required" });
    }
    if (!question) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "question is required" });
    }

    try {
        const responseData = await processMeetingQuery(meetingCode, question, session.user.username);
        return res.status(httpStatus.OK).json(responseData);
    } catch (err) {
        console.error("[QA Controller] Error:", err);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Failed to answer meeting query: ${err.message}`,
        });
    }
};

/**
 * Shared query processor for both REST API and real-time chat bot triggers
 */
export async function processMeetingQuery(meetingCode, question, username = "Participant") {
    const cleanCode = meetingCode.trim().toUpperCase();

    // 1. Retrieve transcripts
    const transcripts = await Transcript.find({ meetingCode: cleanCode })
        .sort({ startTime: 1, timestamp: 1 });

    const segmentsPayload = transcripts.map((t, idx) => ({
        line_number: idx + 1,
        speaker: t.speaker || "Participant",
        text: t.text || "",
        start_time: t.startTime || 0,
        end_time: t.endTime || 0,
    }));

    // 2. Retrieve structured notes
    const notes = await MeetingNotes.findOne({ meetingCode: cleanCode });
    const decisions = (notes?.decisions || []).map((d) => ({
        text: d.text,
        transcript_line: d.transcriptLine,
        speaker: d.speaker || "",
    }));

    const actionItems = (notes?.actionItems || []).map((a) => ({
        task: a.task,
        owner: a.owner,
        due_date: a.dueDate,
        transcript_line: a.transcriptLine,
        status: a.status,
    }));

    // 3. Call AI microservice
    try {
        const aiRes = await fetch(`${AI_SERVICE_URL}/meeting-qa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                meeting_code: cleanCode,
                question: question,
                user: username,
                segments: segmentsPayload,
                notes_summary: notes?.summary || null,
                decisions: decisions,
                action_items: actionItems,
            }),
            signal: AbortSignal.timeout(15000),
        });

        if (aiRes.ok) {
            return await aiRes.json();
        }
    } catch (e) {
        console.warn(`[QA Controller] AI service query error: ${e.message}`);
    }

    // Direct fallback if microservice is offline
    return {
        meeting_code: cleanCode,
        question: question,
        answer: segmentsPayload.length > 0
            ? `Found ${segmentsPayload.length} transcript segment(s) recorded for meeting ${cleanCode}.`
            : `No transcript segments recorded yet for meeting ${cleanCode}.`,
        citations: [],
        confidence: 0.5,
        answered_at: Date.now() / 1000,
    };
}
