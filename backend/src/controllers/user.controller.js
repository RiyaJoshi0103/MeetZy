import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const USERNAME_REGEX = /^[a-zA-Z0-9_.@+-]{2,60}$/;
const MEETING_CODE_REGEX = /^[a-zA-Z0-9.\-_]{3,30}$/;

// Helper: Extract session token from Bearer header, custom header, body, or query
export const extractToken = (req) => {
    const authHeader = req.headers?.authorization;
    if (authHeader && typeof authHeader === "string") {
        if (authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        return authHeader.trim();
    }
    if (req.headers?.token && typeof req.headers.token === "string") {
        return req.headers.token.trim();
    }
    if (req.body?.token && typeof req.body.token === "string") {
        return req.body.token.trim();
    }
    if (req.query?.token && typeof req.query.token === "string") {
        return req.query.token.trim();
    }
    return null;
};

// Helper: Validate token existence, database record, and expiration
export const validateUserSession = async (req) => {
    const token = extractToken(req);
    if (!token) {
        return { error: "Session token is required", status: httpStatus.UNAUTHORIZED };
    }

    try {
        const user = await User.findOne({ token });
        if (!user) {
            return { error: "Invalid session token", status: httpStatus.UNAUTHORIZED };
        }

        if (user.tokenExpires && user.tokenExpires < new Date()) {
            return { error: "Session token has expired. Please log in again.", status: httpStatus.UNAUTHORIZED };
        }

        return { user };
    } catch (e) {
        return { error: `Authentication error: ${e.message}`, status: 500 };
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || typeof username !== "string" || !password || typeof password !== "string") {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Username and password are required" });
    }

    try {
        const cleanUsername = username.trim().toLowerCase();
        const user = await User.findOne({ username: cleanUsername });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User Not Found" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (isPasswordCorrect) {
            const token = crypto.randomBytes(32).toString("hex");
            const tokenExpires = new Date(Date.now() + TOKEN_EXPIRY_MS);

            user.token = token;
            user.tokenExpires = tokenExpires;
            await user.save();

            return res.status(httpStatus.OK).json({
                token: token,
                tokenExpires: tokenExpires.toISOString(),
                username: user.username,
                name: user.name,
            });
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Username or password" });
        }
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const register = async (req, res) => {
    const { name, username, password } = req.body;

    if (!username || typeof username !== "string" || !USERNAME_REGEX.test(username.trim())) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Username or email must be at least 2 characters and contain valid characters",
        });
    }

    if (!password || typeof password !== "string" || password.length < 3) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Password must be at least 3 characters long",
        });
    }

    const cleanUsername = username.trim().toLowerCase();
    const displayName = (name && typeof name === "string" && name.trim().length >= 1)
        ? name.trim()
        : cleanUsername.split("@")[0];

    try {
        const existingUser = await User.findOne({ username: cleanUsername });
        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: displayName,
            username: cleanUsername,
            password: hashedPassword,
        });

        await newUser.save();

        return res.status(httpStatus.CREATED).json({ message: "User Registered Successfully" });
    } catch (e) {
        return res.status(500).json({ message: `Registration error: ${e.message}` });
    }
};

const logout = async (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(httpStatus.OK).json({ message: "Logged out" });
    }

    try {
        const user = await User.findOne({ token });
        if (user) {
            user.token = null;
            user.tokenExpires = null;
            await user.save();
        }
        return res.status(httpStatus.OK).json({ message: "Logged out successfully" });
    } catch (e) {
        return res.status(500).json({ message: `Logout error: ${e.message}` });
    }
};

const getUserHistory = async (req, res) => {
    const session = await validateUserSession(req);
    if (session.error) {
        return res.status(session.status).json({ message: session.error });
    }

    try {
        const meetings = await Meeting.find({ user_id: session.user.username }).sort({ date: -1 });
        return res.json(meetings);
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const addToHistory = async (req, res) => {
    const session = await validateUserSession(req);
    if (session.error) {
        return res.status(session.status).json({ message: session.error });
    }

    const { meeting_code } = req.body;
    if (!meeting_code || typeof meeting_code !== "string" || !MEETING_CODE_REGEX.test(meeting_code.trim())) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Valid meeting_code is required (3-30 alphanumeric chars)" });
    }

    try {
        const cleanCode = meeting_code.trim().toUpperCase();
        let existing = await Meeting.findOne({ meetingCode: cleanCode });
        if (!existing) {
            const newMeeting = new Meeting({
                user_id: session.user.username,
                meetingCode: cleanCode,
                date: new Date(),
            });
            await newMeeting.save();
        }
        return res.status(httpStatus.OK).json({ message: "Added code to history" });
    } catch (e) {
        if (e.code === 11000) {
            return res.status(httpStatus.OK).json({ message: "Meeting already in history" });
        }
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const createMeeting = async (req, res) => {
    const session = await validateUserSession(req);
    if (session.error) {
        return res.status(session.status).json({ message: session.error });
    }

    const { meeting_code } = req.body;
    let code;

    if (meeting_code && typeof meeting_code === "string" && meeting_code.trim()) {
        if (!MEETING_CODE_REGEX.test(meeting_code.trim())) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "Custom meeting code must be 3-30 alphanumeric characters",
            });
        }
        code = meeting_code.trim().toUpperCase();
    } else {
        code = crypto.randomBytes(4).toString("hex").toUpperCase();
    }

    try {
        const existing = await Meeting.findOne({ meetingCode: code });
        if (existing) {
            return res.status(httpStatus.OK).json({ meetingCode: code, message: "Meeting already exists" });
        }

        const newMeeting = new Meeting({
            user_id: session.user.username,
            meetingCode: code,
            date: new Date(),
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({
            meetingCode: code,
            message: "Meeting created successfully",
        });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const getIceServers = async (req, res) => {
    try {
        const iceServers = [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                ],
            },
        ];

        const turnUrls = process.env.TURN_URLS;
        const turnUsername = process.env.TURN_USERNAME;
        const turnCredential = process.env.TURN_CREDENTIAL;

        if (turnUrls && turnUsername && turnCredential) {
            iceServers.push({
                urls: turnUrls.split(",").map((u) => u.trim()),
                username: turnUsername,
                credential: turnCredential,
            });
        } else {
            iceServers.push({
                urls: [
                    "turn:openrelay.metered.ca:80",
                    "turn:openrelay.metered.ca:443",
                    "turn:openrelay.metered.ca:443?transport=tcp",
                ],
                username: "openrelayproject",
                credential: "openrelayproject",
            });
        }

        return res.json({ iceServers });
    } catch (e) {
        return res.status(500).json({ message: "Failed to retrieve ICE servers" });
    }
};

export {
    login,
    register,
    logout,
    getUserHistory,
    addToHistory,
    createMeeting,
    getIceServers,
};
