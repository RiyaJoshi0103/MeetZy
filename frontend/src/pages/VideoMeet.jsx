import React, { useEffect, useRef, useState, useCallback } from "react";
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
import server from "../environment";

const server_url = server;

// Active WebRTC peer connections keyed by remote socketId
const connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const localVideoref = useRef(null);
  const messagesEndRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const isScreenSharingRef = useRef(false);
  const hasInitializedMedia = useRef(false);
  const videoRef = useRef([]);

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

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    }

    return () => {
      // Clean up all tracks and connections on unmount
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
      socketRef.current.emit("join-call", window.location.href);
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);

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

          const pc = new RTCPeerConnection(peerConfigConnections);
          connections[socketListId] = pc;

          pc.onicecandidate = (event) => {
            if (event.candidate != null && socketRef.current) {
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
      const pc = new RTCPeerConnection(peerConfigConnections);
      connections[fromId] = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate != null && socketRef.current) {
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

  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender, data },
    ]);
    if (socketIdSender !== socketIdRef.current) {
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
    }
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
                          {new Date().toLocaleTimeString([], {
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
              style={{ color: video ? "white" : "#ef4444" }}
              title={video ? "Turn Camera Off" : "Turn Camera On"}>
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>

            <IconButton
              onClick={handleEndCall}
              style={{ color: "#ef4444" }}
              title="End Call">
              <CallEndIcon />
            </IconButton>

            <IconButton
              onClick={handleAudio}
              style={{ color: audio ? "white" : "#ef4444" }}
              title={audio ? "Mute Microphone" : "Unmute Microphone"}>
              {audio ? <MicIcon /> : <MicOffIcon />}
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
        </div>
      )}
    </div>
  );
}
