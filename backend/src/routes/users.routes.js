import { Router } from "express";
import {
    addToHistory,
    createMeeting,
    getIceServers,
    getUserHistory,
    login,
    logout,
    register,
} from "../controllers/user.controller.js";
import {
    deleteMeetingTranscript,
    getMeetingTranscript,
} from "../controllers/transcript.controller.js";
import {
    generateMeetingNotes,
    getMeetingNotes,
    updateActionItemStatus,
} from "../controllers/notes.controller.js";
import { authLimiter, apiLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

// Apply general API rate limiter across all user routes
router.use(apiLimiter);

// Auth endpoints with strict brute-force protection
router.route("/login").post(authLimiter, login);
router.route("/register").post(authLimiter, register);
router.route("/logout").post(logout);

// Protected user and meeting routes
router.route("/add_to_activity").post(addToHistory);
router.route("/get_all_activity").get(getUserHistory);
router.route("/create_meeting").post(createMeeting);
router.route("/get_ice_servers").get(getIceServers);

// Transcript routes (retrieve and privacy deletion)
router.route("/transcript/:meetingCode")
    .get(getMeetingTranscript)
    .delete(deleteMeetingTranscript);

// Structured AI Meeting Notes routes
router.route("/notes/:meetingCode/generate").post(generateMeetingNotes);
router.route("/notes/:meetingCode").get(getMeetingNotes);
router.route("/notes/:meetingCode/task/:taskId").patch(updateActionItemStatus);

export default router;
