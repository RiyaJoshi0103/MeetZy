import React, { useEffect, useRef, useState, useCallback, useContext } from "react";
import io from "socket.io-client";
import {
  Badge,
  IconButton,
  TextField,
  Box,
  Typography,
  Paper,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Tooltip,
} from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import ClosedCaptionIcon from "@mui/icons-material/ClosedCaption";
import ClosedCaptionOffIcon from "@mui/icons-material/ClosedCaptionOff";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import MeetingNotesModal from "../components/MeetingNotesModal";
import server from "../environment";
import { AuthContext } from "../contexts/AuthContext";

const server_url = server;

// Active WebRTC peer connections keyed by remote socketId
const connections = {};

const defaultIceServers = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302",
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

export default function VideoMeetComponent() {
  const { getIceServers, deleteTranscript } = useContext(AuthContext);

  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const localVideoref = useRef(null);
  const messagesEndRef = useRef(null);
  const transcriptsEndRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const isScreenSharingRef = useRef(false);
  const hasInitializedMedia = useRef(false);
  const videoRef = useRef([]);

  const peerConfigRef = useRef({
    iceServers: defaultIceServers,
    iceCandidatePoolSize: 10,
  });

  const meetingStartTimeRef = useRef(Date.now());
  const mediaRecorderRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const roomCodeRef = useRef("");

  const [videoAvailable, setVideoAvailable] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [screen, setScreen] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [showModal, setModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);

  // Phase 2 & 3 AI Transcription & Meeting Notes States
  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [roomCode, setRoomCode] = useState(() => (window.location.pathname.split("/").filter(Boolean).pop() || "").toUpperCase());
  const [transcripts, setTranscripts] = useState([]);
  const [liveCaption, setLiveCaption] = useState(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  // Synthetic track helpers for headless/no-device environments
  const createSilenceAudioTrack = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const oscillator = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        oscillator.connect(dst);
        oscillator.start();
        const track = dst.stream.getAudioTracks()[0];
        track.enabled = false;
        return track;
      }
    } catch (e) {
      console.warn("Could not create synthetic silence track:", e);
    }
    return null;
  };

  const createBlackVideoTrack = ({ width = 640, height = 480 } = {}) => {
    try {
      const canvas = Object.assign(document.createElement("canvas"), {
        width,
        height,
      });
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1e1e2f";
        ctx.fillRect(0, 0, width, height);
        const stream = canvas.captureStream ? canvas.captureStream(10) : null;
        if (stream && stream.getVideoTracks()[0]) {
          const track = stream.getVideoTracks()[0];
          track.enabled = false;
          return track;
        }
      }
    } catch (e) {
      console.warn("Could not create synthetic black track:", e);
    }
    return null;
  };

  // Run media initialization only once on mount
  useEffect(() => {
    if (!hasInitializedMedia.current) {
      hasInitializedMedia.current = true;
      getPermissions();

      if (typeof getIceServers === "function") {
        getIceServers().then((servers) => {
          if (servers && Array.isArray(servers) && servers.length > 0) {
            peerConfigRef.current = {
              iceServers: servers,
              iceCandidatePoolSize: 10,
            };
          }
        });
      }
    }

    return () => {
      // Clean up all tracks, recording, and connections on unmount
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
          }
        } catch (e) {}
        mediaRecorderRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      for (const id in connections) {
        try {
          connections[id].close();
        } catch (e) {}
        delete connections[id];
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPermissions = async () => {
    try {
      setScreenAvailable(!!navigator.mediaDevices?.getDisplayMedia);

      let stream = null;
      let hasVideo = false;
      let hasAudio = false;

      // 1. Try requesting both audio and video
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        hasVideo = stream.getVideoTracks().length > 0;
        hasAudio = stream.getAudioTracks().length > 0;
      } catch (errCombined) {
        // 2. Fallback: try audio only (handles users without a camera)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          hasAudio = stream.getAudioTracks().length > 0;
          hasVideo = false;
        } catch (errAudio) {
          // 3. Fallback: try video only (handles users without a mic)
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            hasVideo = stream.getVideoTracks().length > 0;
            hasAudio = false;
          } catch (errVideo) {
            hasVideo = false;
            hasAudio = false;
          }
        }
      }

      // Ensure synthetic tracks exist so WebRTC negotiation can always exchange tracks
      const tracks = [];

      if (hasVideo && stream) {
        const vTrack = stream.getVideoTracks()[0];
        if (vTrack) tracks.push(vTrack);
      } else {
        const blackTrack = createBlackVideoTrack();
        if (blackTrack) tracks.push(blackTrack);
      }

      if (hasAudio && stream) {
        const aTrack = stream.getAudioTracks()[0];
        if (aTrack) tracks.push(aTrack);
      } else {
        const silenceTrack = createSilenceAudioTrack();
        if (silenceTrack) tracks.push(silenceTrack);
      }

      const compositeStream = new MediaStream(tracks);
      localStreamRef.current = compositeStream;
      window.localStream = compositeStream;

      setVideoAvailable(hasVideo);
      setAudioAvailable(hasAudio);
      setVideo(hasVideo);
      setAudio(hasAudio);

      // Initialize track enabled flags
      if (compositeStream.getVideoTracks()[0]) {
        compositeStream.getVideoTracks()[0].enabled = hasVideo;
      }
      if (compositeStream.getAudioTracks()[0]) {
        compositeStream.getAudioTracks()[0].enabled = hasAudio;
      }

      if (localVideoref.current) {
        localVideoref.current.srcObject = compositeStream;
      }
    } catch (error) {
      console.error("Permission check failed:", error);
    }
  };

  // Determine the active video and audio tracks to send to any peer (handles screen share)
  const getActiveStream = useCallback(() => {
    const baseStream = localStreamRef.current || window.localStream;
    let videoTrack = null;

    if (isScreenSharingRef.current && screenStreamRef.current) {
      videoTrack = screenStreamRef.current.getVideoTracks()[0];
    }
    if (!videoTrack && baseStream) {
      videoTrack = baseStream.getVideoTracks()[0];
    }

    const audioTrack = baseStream ? baseStream.getAudioTracks()[0] : null;

    const activeTracks = [];
    if (videoTrack) activeTracks.push(videoTrack);
    if (audioTrack) activeTracks.push(audioTrack);

    return new MediaStream(activeTracks);
  }, []);

  const updateRemoteVideos = (socketListId, stream) => {
    setVideos((prevVideos) => {
      const exists = prevVideos.find((v) => v.socketId === socketListId);
      if (exists) {
        return prevVideos.map((v) =>
          v.socketId === socketListId ? { ...v, stream } : v
        );
      }
      const updated = [
        ...prevVideos,
        {
          socketId: socketListId,
          stream,
          autoplay: true,
          playsinline: true,
        },
      ];
      videoRef.current = updated;
      return updated;
    });
  };

  const connect = () => {
    setAskForUsername(false);
    setShowConsentModal(true);
    connectToSocketServer();
  };

  const connectToSocketServer = () => {
    const token = localStorage.getItem("token");
    socketRef.current = io.connect(server_url, {
      secure: false,
      auth: { token },
      query: { token },
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("Socket authentication failed:", err.message);
      alert("Authentication error: " + (err.message || "Please log in"));
      window.location.href = "/auth";
    });

    socketRef.current.on("join-error", (data) => {
      console.error("Join call rejected:", data.message);
      alert(data.message || "Failed to join room.");
      window.location.href = "/home";
    });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      try {
        const clean = window.location.pathname.split("/").filter(Boolean).pop();
        const code = (clean || "").toUpperCase();
        roomCodeRef.current = code;
        setRoomCode(code);
      } catch (e) {}

      socketRef.current.emit("join-call", window.location.href);
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);

      // Real-time AI transcription listeners
      socketRef.current.on("transcript-update", (entry) => {
        setTranscripts((prev) => [...prev, entry]);
        setLiveCaption(entry);
        setTimeout(() => {
          setLiveCaption((curr) =>
            curr && (curr.id === entry.id || curr._id === entry._id) ? null : curr
          );
        }, 5000);
      });

      socketRef.current.on("transcript-history", (history) => {
        if (Array.isArray(history)) {
          setTranscripts(history);
        }
      });

      socketRef.current.on("transcript-cleared", () => {
        setTranscripts([]);
        setLiveCaption(null);
      });

      socketRef.current.on("user-left", (id) => {
        if (connections[id]) {
          try {
            connections[id].close();
          } catch (e) {}
          delete connections[id];
        }
        setVideos((prevVideos) => prevVideos.filter((video) => video.socketId !== id));
      });

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          // Never connect to ourselves
          if (socketListId === socketIdRef.current) return;

          // Do not recreate existing peer connection for users already connected
          if (connections[socketListId]) return;

          const pc = new RTCPeerConnection(peerConfigRef.current);
          connections[socketListId] = pc;

          pc.onicecandidate = (event) => {
            if (event.candidate != null && socketRef.current) {
              const candStr = event.candidate.candidate || "";
              if (candStr.includes("typ relay")) {
                console.log(`[TURN] Relay candidate gathered for peer ${socketListId}`);
              }
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          // Modern ontrack listener with fallback to onaddstream
          pc.ontrack = (event) => {
            const stream =
              event.streams && event.streams[0]
                ? event.streams[0]
                : new MediaStream([event.track]);
            updateRemoteVideos(socketListId, stream);
          };

          pc.onaddstream = (event) => {
            updateRemoteVideos(socketListId, event.stream);
          };

          // Attach active media (camera or screen share for late joiners)
          const streamToSend = getActiveStream();
          if (pc.addTrack && streamToSend.getTracks().length > 0) {
            streamToSend.getTracks().forEach((track) => {
              pc.addTrack(track, streamToSend);
            });
          } else if (pc.addStream) {
            pc.addStream(streamToSend);
          }
        });

        // The newly joined client creates offers to all other clients
        if (id === socketIdRef.current) {
          for (const id2 in connections) {
            if (id2 === socketIdRef.current) continue;

            connections[id2]
              .createOffer()
              .then((description) => {
                return connections[id2].setLocalDescription(description);
              })
              .then(() => {
                if (socketRef.current) {
                  socketRef.current.emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription })
                  );
                }
              })
              .catch((e) => console.error("Error creating offer:", e));
          }
        }
      });
    });
  };

  const gotMessageFromServer = (fromId, message) => {
    let signal;
    try {
      signal = JSON.parse(message);
    } catch (e) {
      return;
    }

    if (fromId === socketIdRef.current) return;

    if (!connections[fromId]) {
      const pc = new RTCPeerConnection(peerConfigRef.current);
      connections[fromId] = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate != null && socketRef.current) {
          const candStr = event.candidate.candidate || "";
          if (candStr.includes("typ relay")) {
            console.log(`[TURN] Relay candidate gathered for peer ${fromId}`);
          }
          socketRef.current.emit(
            "signal",
            fromId,
            JSON.stringify({ ice: event.candidate })
          );
        }
      };

      pc.ontrack = (event) => {
        const stream =
          event.streams && event.streams[0]
            ? event.streams[0]
            : new MediaStream([event.track]);
        updateRemoteVideos(fromId, stream);
      };

      pc.onaddstream = (event) => {
        updateRemoteVideos(fromId, event.stream);
      };

      const streamToSend = getActiveStream();
      if (pc.addTrack && streamToSend.getTracks().length > 0) {
        streamToSend.getTracks().forEach((track) => pc.addTrack(track, streamToSend));
      } else if (pc.addStream) {
        pc.addStream(streamToSend);
      }
    }

    const pc = connections[fromId];

    if (signal.sdp) {
      pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === "offer") {
            pc.createAnswer()
              .then((description) => pc.setLocalDescription(description))
              .then(() => {
                if (socketRef.current) {
                  socketRef.current.emit(
                    "signal",
                    fromId,
                    JSON.stringify({ sdp: pc.localDescription })
                  );
                }
              })
              .catch((e) => console.error("Error creating answer:", e));
          }
        })
        .catch((e) => console.error("Error setting remote description:", e));
    }

    if (signal.ice) {
      pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch((e) =>
        console.error("Error adding ICE candidate:", e)
      );
    }
  };

  const addMessage = (data, sender, socketIdSender, timestamp) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        sender,
        data,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    ]);
    if (socketIdSender && socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  };

  const sendMessage = () => {
    if (socketRef.current && message.trim()) {
      socketRef.current.emit("chat-message", message.trim());
      setMessage("");
    }
  };

  // Mute / Unmute: toggles audio track.enabled on localStream
  const handleAudio = () => {
    const stream = localStreamRef.current || window.localStream;
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const nextState = !audioTrack.enabled;
      audioTrack.enabled = nextState;
      setAudio(nextState);

      if (nextState && consentGiven) {
        startAudioRecording();
      } else {
        stopAudioRecording();
      }
    }
  };

  // Web Speech API: Real-time speech-to-text recognition directly in the browser
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let interimText = "";
        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript;
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        const speakerName = username || "You";

        if (interimText.trim()) {
          setLiveCaption({
            speaker: speakerName,
            text: interimText.trim(),
            isInterim: true,
          });
        }

        if (finalText.trim() && socketRef.current?.connected) {
          const clean = finalText.trim();
          const now = (Date.now() - meetingStartTimeRef.current) / 1000;
          socketRef.current.emit("audio-chunk", {
            text: clean,
            startTime: Math.max(0, now - 3),
            endTime: now,
          });
        }
      };

      recognition.onerror = (e) => {
        if (e.error !== "no-speech") {
          console.warn("Speech recognition notice:", e.error);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (err) {}
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
      isListeningRef.current = true;
    } catch (err) {
      console.warn("Speech recognition error:", err);
    }
  };

  const stopSpeechRecognition = () => {
    isListeningRef.current = false;
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
  };

  // Phase 2 AI Transcription & Speech Capture
  const startAudioRecording = () => {
    const stream = localStreamRef.current || window.localStream;
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack || !audioTrack.enabled) return;

    // Start Web Speech API for instant words
    startSpeechRecognition();

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        return;
      }

      const audioOnlyStream = new MediaStream([audioTrack]);
      let mimeType = "audio/webm;codecs=opus";
      if (typeof MediaRecorder !== "undefined" && !MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      }

      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(audioOnlyStream, options);
      mediaRecorderRef.current = recorder;

      let chunkStartTime = (Date.now() - meetingStartTimeRef.current) / 1000;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && socketRef.current?.connected) {
          const chunkEndTime = (Date.now() - meetingStartTimeRef.current) / 1000;
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result ? reader.result.toString().split(",")[1] : null;
            if (base64Data && socketRef.current) {
              socketRef.current.emit("audio-chunk", {
                audioBase64: base64Data,
                startTime: chunkStartTime,
                endTime: chunkEndTime,
              });
            }
          };
          reader.readAsDataURL(event.data);
          chunkStartTime = chunkEndTime;
        }
      };

      recorder.start(4000);
    } catch (err) {
      console.warn("MediaRecorder audio capture initialization:", err);
    }
  };

  const stopAudioRecording = () => {
    stopSpeechRecognition();
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
  };

  const formatTimeOffset = (seconds) => {
    if (typeof seconds !== "number" || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownloadTranscript = () => {
    if (!transcripts || transcripts.length === 0) return;
    const room = roomCodeRef.current || "MEETING";
    let content = `MEETZY AI MEETING TRANSCRIPT\nRoom Code: ${room}\nGenerated: ${new Date().toISOString()}\nTotal Segments: ${transcripts.length}\n${"-".repeat(45)}\n\n`;

    transcripts.forEach((item) => {
      const timeStr = formatTimeOffset(item.startTime);
      content += `[${timeStr}] ${item.speaker || "Speaker"}:\n${item.text}\n\n`;
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meetzy-transcript-${room}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearTranscript = async () => {
    if (!window.confirm("Are you sure you want to permanently delete the transcript for this meeting?")) {
      return;
    }
    const room = roomCodeRef.current;
    if (socketRef.current?.connected) {
      socketRef.current.emit("transcript-clear");
    }
    if (typeof deleteTranscript === "function" && room) {
      try {
        await deleteTranscript(room);
      } catch (e) {
        console.warn("Delete transcript API error:", e);
      }
    }
    setTranscripts([]);
    setLiveCaption(null);
  };

  // Camera On / Off: toggles video track.enabled on localStream
  const handleVideo = () => {
    const stream = localStreamRef.current || window.localStream;
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const nextState = !videoTrack.enabled;
      videoTrack.enabled = nextState;
      setVideo(nextState);
    }
  };

  // Replace video track across all active peer senders
  const replaceVideoTrackInPeers = (newTrack) => {
    for (const peerId in connections) {
      const pc = connections[peerId];
      if (!pc || !pc.getSenders) continue;

      const videoSender = pc.getSenders().find(
        (sender) => sender.track && sender.track.kind === "video"
      );

      if (videoSender && typeof videoSender.replaceTrack === "function") {
        videoSender.replaceTrack(newTrack).catch((err) => {
          console.error(`replaceTrack failed for peer ${peerId}:`, err);
        });
      }
    }
  };

  // Screen share: Captures display, uses replaceTrack, and restores camera on stop
  const handleScreen = async () => {
    if (!screenAvailable) return;

    if (screen) {
      stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  const startScreenShare = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const screenVideoTrack = displayStream.getVideoTracks()[0];
      if (!screenVideoTrack) return;

      screenStreamRef.current = displayStream;
      isScreenSharingRef.current = true;
      setScreen(true);

      // Handle when user stops sharing via browser chrome bar
      screenVideoTrack.onended = () => {
        stopScreenShare();
      };

      // Switch track across all peer connections to display share
      replaceVideoTrackInPeers(screenVideoTrack);

      // Update local preview to show the active screen share
      if (localVideoref.current) {
        localVideoref.current.srcObject = displayStream;
      }
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        console.error("Failed to capture screen:", err);
      }
      setScreen(false);
      isScreenSharingRef.current = false;
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    isScreenSharingRef.current = false;
    setScreen(false);

    // Restore original camera video track to peers
    const baseStream = localStreamRef.current || window.localStream;
    const cameraVideoTrack = baseStream ? baseStream.getVideoTracks()[0] : null;

    if (cameraVideoTrack) {
      replaceVideoTrackInPeers(cameraVideoTrack);
    }

    // Restore local video preview to camera stream
    if (localVideoref.current && baseStream) {
      localVideoref.current.srcObject = baseStream;
    }
  };

  const handleEndCall = () => {
    stopAudioRecording();
    stopScreenShare();
    try {
      const stream = localStreamRef.current || window.localStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {}

    for (const id in connections) {
      try {
        connections[id].close();
      } catch (e) {}
      delete connections[id];
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    window.location.href = "/";
  };

  return (
    <div>
      {askForUsername ? (
        <div>
          <h2>Enter into Lobby </h2>
          <TextField
            id="outlined-basic"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
          />
          <Button variant="contained" onClick={connect} disabled={!username.trim()}>
            Connect
          </Button>

          <div>
            <video ref={localVideoref} autoPlay muted playsInline></video>
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          {/* AI Transcription Notice & Status Indicator */}
          <Box
            sx={{
              position: "fixed",
              top: 16,
              left: 16,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}>
            {consentGiven ? (
              <Chip
                icon={
                  <FiberManualRecordIcon
                    sx={{
                      fontSize: "14px !important",
                      color: "#ef4444 !important",
                      animation: "pulse 1.5s infinite",
                      "@keyframes pulse": {
                        "0%": { opacity: 1, transform: "scale(1)" },
                        "50%": { opacity: 0.3, transform: "scale(1.2)" },
                        "100%": { opacity: 1, transform: "scale(1)" },
                      },
                    }}
                  />
                }
                label="AI Transcribing"
                size="small"
                sx={{
                  background: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(8px)",
                  color: "#f8fafc",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  px: 0.5,
                }}
              />
            ) : (
              <Chip
                label="AI Transcribe: Opted Out"
                size="small"
                onClick={() => setShowConsentModal(true)}
                sx={{
                  background: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(8px)",
                  color: "#94a3b8",
                  border: "1px solid rgba(148, 163, 184, 0.25)",
                  fontWeight: 500,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: "#6366f1",
                    color: "#f8fafc",
                  },
                }}
              />
            )}
          </Box>

          {/* Live Subtitles / Caption Overlay (Google Meet / Zoom style) */}
          {showCaptions && liveCaption && (
            <Box
              sx={{
                position: "fixed",
                bottom: 84,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 100,
                maxWidth: "80vw",
                pointerEvents: "none",
                animation: "fadeIn 0.2s ease-in-out",
                "@keyframes fadeIn": {
                  from: { opacity: 0, transform: "translate(-50%, 8px)" },
                  to: { opacity: 1, transform: "translate(-50%, 0)" },
                },
              }}>
              <Paper
                elevation={8}
                sx={{
                  px: 3,
                  py: 1.25,
                  borderRadius: 3,
                  background: "rgba(15, 23, 42, 0.90)",
                  backdropFilter: "blur(14px)",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  color: "white",
                  textAlign: "center",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: "1.05rem",
                    fontWeight: 500,
                    letterSpacing: "0.015em",
                    lineHeight: 1.45,
                  }}>
                  <strong style={{ color: "#a5b4fc", marginRight: 10 }}>
                    {liveCaption.speaker}:
                  </strong>
                  <span style={{ fontStyle: liveCaption.isInterim ? "italic" : "normal" }}>
                    "{liveCaption.text}"
                  </span>
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Transcript Sidebar Drawer */}
          {showTranscript && (
            <Box
              sx={{
                position: "fixed",
                top: 0,
                right: showModal ? "350px" : 0,
                width: "360px",
                height: "100vh",
                zIndex: 999,
                animation: "slideInRight 0.3s ease-out",
                "@keyframes slideInRight": {
                  "0%": { opacity: 0, transform: "translateX(100%)" },
                  "100%": { opacity: 1, transform: "translateX(0)" },
                },
              }}>
              <Paper
                elevation={8}
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: showModal ? 0 : "12px 0 0 12px",
                  background: "rgba(255, 255, 255, 0.98)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRight: showModal ? "1px solid #e2e8f0" : "none",
                  overflow: "hidden",
                }}>
                {/* Transcript Header */}
                <Box
                  sx={{
                    background:
                      "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
                    color: "white",
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <ClosedCaptionIcon sx={{ color: "#a5b4fc" }} />
                    <Typography variant="h6" fontWeight="600" fontSize="1.05rem">
                      Live Transcript
                    </Typography>
                    <Chip
                      label={`${transcripts.length}`}
                      size="small"
                      sx={{
                        background: "rgba(255,255,255,0.2)",
                        color: "white",
                        height: 20,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Tooltip title="Download Transcript (.txt)">
                      <span>
                        <IconButton
                          onClick={handleDownloadTranscript}
                          size="small"
                          sx={{ color: "white" }}
                          disabled={transcripts.length === 0}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Clear & Delete Transcript">
                      <span>
                        <IconButton
                          onClick={handleClearTranscript}
                          size="small"
                          sx={{ color: "#fca5a5" }}
                          disabled={transcripts.length === 0}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <IconButton
                      onClick={() => setShowTranscript(false)}
                      size="small"
                      sx={{ color: "white" }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Transcript Body */}
                <Box
                  sx={{
                    flex: 1,
                    p: 2,
                    overflowY: "auto",
                    background:
                      "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                  }}>
                  {transcripts.length === 0 ? (
                    <Box
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "grey.500",
                        p: 3,
                        textAlign: "center",
                      }}>
                      <ClosedCaptionIcon sx={{ fontSize: 44, mb: 1.5, opacity: 0.4 }} />
                      <Typography variant="body2" fontWeight={500}>
                        No speech transcribed yet
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}>
                        {consentGiven
                          ? "Speak into your mic — AI will transcribe each speaker automatically."
                          : "AI transcription is currently opted out. Click the top indicator to consent."}
                      </Typography>
                    </Box>
                  ) : (
                    transcripts.map((item, idx) => (
                      <Box key={item._id || item.id || idx} sx={{ mb: 2 }}>
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          mb={0.5}>
                          <Box display="flex" alignItems="center" gap={0.75}>
                            <Avatar
                              sx={{
                                width: 22,
                                height: 22,
                                fontSize: "0.65rem",
                                bgcolor:
                                  item.speaker === username
                                    ? "#4f46e5"
                                    : "#0d9488",
                              }}>
                              {item.speaker?.charAt(0)?.toUpperCase() || "A"}
                            </Avatar>
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              color="text.primary">
                              {item.speaker === username ? "You" : item.speaker}
                            </Typography>
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontSize="0.7rem">
                            {formatTimeOffset(item.startTime)}
                          </Typography>
                        </Box>
                        <Paper
                          elevation={1}
                          sx={{
                            p: 1.25,
                            borderRadius: 2,
                            background: "white",
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}>
                          <Typography
                            variant="body2"
                            sx={{ lineHeight: 1.45, color: "#1e293b" }}>
                            {item.text}
                          </Typography>
                        </Paper>
                      </Box>
                    ))
                  )}
                  <div ref={transcriptsEndRef} />
                </Box>
              </Paper>
            </Box>
          )}

          {/* AI Transcription & Recording Consent Modal */}
          <Dialog
            open={showConsentModal}
            onClose={() => setShowConsentModal(false)}
            maxWidth="xs"
            PaperProps={{
              sx: {
                borderRadius: 3,
                p: 1,
                background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
              },
            }}>
            <DialogTitle sx={{ fontWeight: 700, pb: 1, color: "#1e1b4b" }}>
              AI Transcription Notice
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ color: "#475569", fontSize: "0.9rem", mb: 1.5 }}>
                Meetzy includes automated AI audio transcription powered by Whisper. Each participant's microphone audio is analyzed to generate live captions and speaker-attributed meeting transcripts.
              </DialogContentText>
              <DialogContentText sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                Under privacy regulations, all participants must provide consent before audio streaming begins. You can opt out at any time or request deletion of saved transcripts.
              </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, display: "flex", gap: 1 }}>
              <Button
                onClick={() => {
                  setConsentGiven(false);
                  setShowConsentModal(false);
                  stopAudioRecording();
                }}
                variant="outlined"
                color="inherit"
                sx={{ textTransform: "none", borderRadius: 2 }}>
                Opt Out
              </Button>
              <Button
                onClick={() => {
                  setConsentGiven(true);
                  setShowConsentModal(false);
                  startAudioRecording();
                }}
                variant="contained"
                sx={{
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  color: "white",
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 600,
                  "&:hover": {
                    background: "linear-gradient(135deg, #4338ca, #6d28d9)",
                  },
                }}>
                I Consent & Enable AI
              </Button>
            </DialogActions>
          </Dialog>

          {/* Chat Sidebar */}
          {showModal && (
            <Box
              sx={{
                position: "fixed",
                top: 0,
                right: 0,
                width: "350px",
                height: "100vh",
                zIndex: 1000,
                animation: "slideInRight 0.3s ease-out",
                "@keyframes slideInRight": {
                  "0%": {
                    opacity: 0,
                    transform: "translateX(100%)",
                  },
                  "100%": {
                    opacity: 1,
                    transform: "translateX(0)",
                  },
                },
              }}>
              <Paper
                elevation={8}
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "12px 0 0 12px",
                  background: "rgba(255, 255, 255, 0.98)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRight: "none",
                  overflow: "hidden",
                }}>
                {/* Chat Header */}
                <Box
                  sx={{
                    background:
                      "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)",
                    color: "white",
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <ChatIcon />
                    <Typography variant="h6" fontWeight="600">
                      Chat
                    </Typography>
                    <Badge
                      badgeContent={newMessages}
                      color="error"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                  <IconButton
                    onClick={() => setModal(false)}
                    sx={{ color: "white" }}>
                    <CloseIcon />
                  </IconButton>
                </Box>

                {/* Messages Container */}
                <Box
                  sx={{
                    flex: 1,
                    p: 2,
                    overflowY: "auto",
                    background:
                      "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                    "&::-webkit-scrollbar": {
                      width: "6px",
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "#f1f1f1",
                      borderRadius: "10px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: "#cbd5e1",
                      borderRadius: "10px",
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                      background: "#94a3b8",
                    },
                  }}>
                  {messages.length === 0 ? (
                    <Box
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "grey.500",
                      }}>
                      <ChatIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                      <Typography variant="body1" textAlign="center">
                        No messages yet
                        <br />
                        <Typography variant="body2" component="span">
                          Start the conversation!
                        </Typography>
                      </Typography>
                    </Box>
                  ) : (
                    messages.map((item, index) => (
                      <Box
                        key={index}
                        sx={{
                          mb: 2,
                          display: "flex",
                          flexDirection: "column",
                          alignItems:
                            item.sender === username
                              ? "flex-end"
                              : "flex-start",
                        }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "grey.600",
                            fontWeight: 600,
                            mb: 0.5,
                            fontSize: "0.75rem",
                          }}>
                          {item.sender === username ? "You" : item.sender}
                        </Typography>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-end",
                            gap: 1,
                            maxWidth: "90%",
                          }}>
                          {item.sender !== username && (
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: "0.75rem",
                                bgcolor: "primary.main",
                              }}>
                              {item.sender?.charAt(0)?.toUpperCase()}
                            </Avatar>
                          )}

                          <Paper
                            elevation={2}
                            sx={{
                              p: 1.5,
                              borderRadius: 3,
                              background:
                                item.sender === username
                                  ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                                  : "white",
                              color:
                                item.sender === username ? "white" : "grey.800",
                              border:
                                item.sender === username
                                  ? "none"
                                  : "1px solid rgba(0, 0, 0, 0.1)",
                              maxWidth: "100%",
                              wordBreak: "break-word",
                            }}>
                            <Typography
                              variant="body2"
                              sx={{ lineHeight: 1.4 }}>
                              {item.data}
                            </Typography>
                          </Paper>

                          {item.sender === username && (
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: "0.75rem",
                                bgcolor: "grey.400",
                              }}>
                              You
                            </Avatar>
                          )}
                        </Box>

                        <Typography
                          variant="caption"
                          sx={{
                            color: "grey.500",
                            mt: 0.5,
                            fontSize: "0.7rem",
                          }}>
                          {(item.timestamp ? new Date(item.timestamp) : new Date()).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </Box>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Input Area */}
                <Box
                  sx={{
                    p: 2,
                    borderTop: "1px solid",
                    borderColor: "grey.200",
                    background: "white",
                  }}>
                  <Box display="flex" gap={1} alignItems="flex-end">
                    <TextField
                      fullWidth
                      size="small"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      variant="outlined"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && message.trim()) {
                          sendMessage();
                        }
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 3,
                          "&:hover fieldset": {
                            borderColor: "#4f46e5",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#4f46e5",
                          },
                        },
                      }}
                    />
                    <IconButton
                      onClick={sendMessage}
                      disabled={!message.trim()}
                      sx={{
                        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                        color: "white",
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #4338ca, #6d28d9)",
                          transform: "scale(1.1)",
                        },
                        "&:disabled": {
                          background: "grey.400",
                          color: "grey.200",
                        },
                        transition: "all 0.3s ease",
                        width: 40,
                        height: 40,
                      }}>
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            </Box>
          )}

          {/* Control Buttons */}
          <div className={styles.buttonContainers}>
            <IconButton
              onClick={handleVideo}
              disabled={!videoAvailable}
              style={{ color: video && videoAvailable ? "white" : "#ef4444" }}
              title={!videoAvailable ? "No Camera Detected" : (video ? "Turn Camera Off" : "Turn Camera On")}>
              {video && videoAvailable ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>

            <IconButton
              onClick={handleEndCall}
              style={{ color: "#ef4444" }}
              title="End Call">
              <CallEndIcon />
            </IconButton>

            <IconButton
              onClick={handleAudio}
              disabled={!audioAvailable}
              style={{ color: audio && audioAvailable ? "white" : "#ef4444" }}
              title={!audioAvailable ? "No Microphone Detected" : (audio ? "Mute Microphone" : "Unmute Microphone")}>
              {audio && audioAvailable ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            {screenAvailable && (
              <IconButton
                onClick={handleScreen}
                style={{ color: screen ? "#ef4444" : "white" }}
                title={screen ? "Stop Screen Share" : "Share Screen"}>
                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </IconButton>
            )}

            <Badge badgeContent={newMessages} max={999} color="error">
              <IconButton
                onClick={() => {
                  setModal(!showModal);
                  setNewMessages(0);
                }}
                style={{ color: "white" }}
                title="Toggle Chat">
                <ChatIcon />
              </IconButton>
            </Badge>

            <IconButton
              onClick={() => setShowCaptions((prev) => !prev)}
              style={{ color: showCaptions ? "#818cf8" : "rgba(255,255,255,0.4)" }}
              title={showCaptions ? "Turn Off Live Captions (CC)" : "Turn On Live Captions (CC)"}>
              {showCaptions ? <ClosedCaptionIcon /> : <ClosedCaptionOffIcon />}
            </IconButton>

            <IconButton
              onClick={() => setShowNotesModal(true)}
              style={{ color: "#c084fc" }}
              title="AI Meeting Notes & Action Items">
              <AutoAwesomeIcon />
            </IconButton>
          </div>

          {/* Local Video */}
          <video
            className={styles.meetUserVideo}
            ref={localVideoref}
            autoPlay
            muted
            playsInline></video>

          {/* Remote Videos */}
          <div className={styles.conferenceView}>
            {videos.map((v) => (
              <div key={v.socketId}>
                <video
                  data-socket={v.socketId}
                  ref={(ref) => {
                    if (ref && v.stream) {
                      ref.srcObject = v.stream;
                    }
                  }}
                  autoPlay
                  playsInline></video>
              </div>
            ))}
          </div>

          <MeetingNotesModal
            open={showNotesModal}
            onClose={() => setShowNotesModal(false)}
            meetingCode={roomCode || roomCodeRef.current}
            socket={socketRef.current}
          />
        </div>
      )}
    </div>
  );
}
