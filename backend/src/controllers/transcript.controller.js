import httpStatus from "http-status";
import { Transcript } from "../models/transcript.model.js";
import { validateUserSession } from "./user.controller.js";

const getMeetingTranscript = async (req, res) => {
    const session = await validateUserSession(req);
    if (session.error) {
        return res.status(session.status).json({ message: session.error });
    }

    const { meetingCode } = req.params;
    if (!meetingCode) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Meeting code is required" });
    }

    try {
        const cleanCode = meetingCode.trim().toUpperCase();
        const entries = await Transcript.find({ meetingCode: cleanCode })
            .sort({ startTime: 1, timestamp: 1 });

        return res.json({
            meetingCode: cleanCode,
            totalSegments: entries.length,
            transcript: entries,
        });
    } catch (e) {
        return res.status(500).json({ message: `Error retrieving transcript: ${e.message}` });
    }
};

const deleteMeetingTranscript = async (req, res) => {
    const session = await validateUserSession(req);
    if (session.error) {
        return res.status(session.status).json({ message: session.error });
    }

    const { meetingCode } = req.params;
    if (!meetingCode) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Meeting code is required" });
    }

    try {
        const cleanCode = meetingCode.trim().toUpperCase();
        const result = await Transcript.deleteMany({ meetingCode: cleanCode });

        return res.json({
            message: "Transcript deleted successfully",
            deletedCount: result.deletedCount,
        });
    } catch (e) {
        return res.status(500).json({ message: `Error deleting transcript: ${e.message}` });
    }
};

export { getMeetingTranscript, deleteMeetingTranscript };
