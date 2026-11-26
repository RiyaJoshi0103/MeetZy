import axios from "axios";
import httpStatus from "http-status";
import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";


export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
})

// Attach Bearer token in headers for all authenticated requests
client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auto-clean stale token on 401 Unauthorized
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
        }
        return Promise.reject(error);
    }
);


export const AuthProvider = ({ children }) => {

    const authContext = useContext(AuthContext);


    const [userData, setUserData] = useState(authContext);


    const router = useNavigate();

    const handleRegister = async (name, username, password) => {
        try {
            let request = await client.post("/register", {
                name: name,
                username: username,
                password: password
            })


            if (request.status === httpStatus.CREATED) {
                return request.data.message;
            }
        } catch (err) {
            throw err;
        }
    }

    const handleLogin = async (username, password) => {
        try {
            let request = await client.post("/login", {
                username: username,
                password: password
            });

            if (request.status === httpStatus.OK) {
                localStorage.setItem("token", request.data.token);
                router("/home")
            }
        } catch (err) {
            throw err;
        }
    }

    const getHistoryOfUser = async () => {
        try {
            let request = await client.get("/get_all_activity", {
                params: {
                    token: localStorage.getItem("token")
                }
            });
            return request.data
        } catch
         (err) {
            throw err;
        }
    }

    const addToUserHistory = async (meetingCode) => {
        try {
            let request = await client.post("/add_to_activity", {
                token: localStorage.getItem("token"),
                meeting_code: meetingCode
            });
            return request
        } catch (e) {
            throw e;
        }
    }

    const createMeeting = async (meetingCode) => {
        try {
            let request = await client.post("/create_meeting", {
                token: localStorage.getItem("token"),
                meeting_code: meetingCode
            });
            return request.data;
        } catch (e) {
            throw e;
        }
    }

    const getIceServers = async () => {
        try {
            let request = await client.get("/get_ice_servers");
            if (request.data && Array.isArray(request.data.iceServers)) {
                return request.data.iceServers;
            }
        } catch (e) {}

        // Safe fallback including STUN and OpenRelay TURN
        return [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                ],
            },
            {
                urls: [
                    "turn:openrelay.metered.ca:80",
                    "turn:openrelay.metered.ca:443",
                    "turn:openrelay.metered.ca:443?transport=tcp",
                ],
                username: "openrelayproject",
                credential: "openrelayproject",
            },
        ];
    }

    const handleLogout = async () => {
        try {
            await client.post("/logout");
        } catch (e) {}
        localStorage.removeItem("token");
        setUserData(null);
        router("/auth");
    };

    const getTranscript = async (meetingCode) => {
        try {
            let request = await client.get(`/transcript/${meetingCode}`);
            return request.data;
        } catch (e) {
            throw e;
        }
    };

    const deleteTranscript = async (meetingCode) => {
        try {
            let request = await client.delete(`/transcript/${meetingCode}`);
            return request.data;
        } catch (e) {
            throw e;
        }
    };

    const data = {
        userData, setUserData, addToUserHistory, createMeeting, getIceServers, getHistoryOfUser, handleRegister, handleLogin, handleLogout, getTranscript, deleteTranscript
    }

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    )

}
