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

export default router;
