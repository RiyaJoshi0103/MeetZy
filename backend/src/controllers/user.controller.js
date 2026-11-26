import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt, { hash } from "bcrypt"

import crypto from "crypto"
import { Meeting } from "../models/meeting.model.js";
const login = async (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Please Provide" })
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User Not Found" })
        }


        let isPasswordCorrect = await bcrypt.compare(password, user.password)

        if (isPasswordCorrect) {
            let token = crypto.randomBytes(20).toString("hex");

            user.token = token;
            await user.save();
            return res.status(httpStatus.OK).json({ token: token })
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Username or password" })
        }

    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` })
    }
}


const register = async (req, res) => {
    const { name, username, password } = req.body;


    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(httpStatus.FOUND).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword
        });

        await newUser.save();

        res.status(httpStatus.CREATED).json({ message: "User Registered" })

    } catch (e) {
        res.json({ message: `Something went wrong ${e}` })
    }

}


const getUserHistory = async (req, res) => {
    const { token } = req.query;

    if (!token || typeof token !== "string" || !token.trim()) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Unauthorized" });
    }

    try {
        const user = await User.findOne({ token: token.trim() });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Unauthorized" });
        }
        const meetings = await Meeting.find({ user_id: user.username })
        res.json(meetings)
    } catch (e) {
        res.status(500).json({ message: `Something went wrong ${e}` })
    }
}

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    if (!token || typeof token !== "string" || !token.trim()) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Unauthorized" });
    }

    try {
        const user = await User.findOne({ token: token.trim() });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Unauthorized" });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        })

        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ message: "Added code to history" })
    } catch (e) {
        res.status(500).json({ message: `Something went wrong ${e}` })
    }
}


const createMeeting = async (req, res) => {
    const { token, meeting_code } = req.body;

    if (!token || typeof token !== "string" || !token.trim()) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Token is required" });
    }

    try {
        const user = await User.findOne({ token: token.trim() });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Unauthorized" });
        }

        const code = (meeting_code && typeof meeting_code === "string" && meeting_code.trim())
            ? meeting_code.trim().toUpperCase()
            : crypto.randomBytes(4).toString("hex").toUpperCase();

        const existing = await Meeting.findOne({ meetingCode: code });
        if (existing) {
            return res.status(httpStatus.OK).json({ meetingCode: code, message: "Meeting already exists" });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: code,
            date: new Date()
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({
            meetingCode: code,
            message: "Meeting created successfully"
        });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
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
            // Default free TURN relay for NAT/firewall traversal
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

export { login, register, getUserHistory, addToHistory, createMeeting, getIceServers }