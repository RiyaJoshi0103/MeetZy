import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import {
  Badge,
  IconButton,
  TextField,
  Box,
  Typography,
  Paper,
  Avatar,
} from "@mui/material";
import { Button } from "@mui/material";
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

var connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  var socketRef = useRef();
  let socketIdRef = useRef();
  let localVideoref = useRef();
  let messagesEndRef = useRef();

  let [videoAvailable, setVideoAvailable] = useState(true);
  let [audioAvailable, setAudioAvailable] = useState(true);
  let [video, setVideo] = useState([]);
  let [audio, setAudio] = useState();
  let [screen, setScreen] = useState();
  let [showModal, setModal] = useState(false);
  let [screenAvailable, setScreenAvailable] = useState();
  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [newMessages, setNewMessages] = useState(0);
  let [askForUsername, setAskForUsername] = useState(true);
  let [username, setUsername] = useState("");
  const videoRef = useRef([]);
  let [videos, setVideos] = useState([]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    console.log("HELLO");
    getPermissions();
  });

  const getPermissions = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoPermission) {
        setVideoAvailable(true);
        console.log("Video permission granted");
      } else {
        setVideoAvailable(false);
        console.log("Video permission denied");
      }

      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (audioPermission) {
        setAudioAvailable(true);
        console.log("Audio permission granted");
      } else {
        setAudioAvailable(false);
        console.log("Audio permission denied");
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      } else {
        setScreenAvailable(false);
      }

      if (videoAvailable || audioAvailable) {
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoAvailable,
          audio: audioAvailable,
        });
        if (userMediaStream) {
          window.localStream = userMediaStream;
          if (localVideoref.current) {
            localVideoref.current.srcObject = userMediaStream;
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const connect = () => {
    setAskForUsername(false);
    getMedia();
  };

  const getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", window.location.href);
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
      });

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );

          connections[socketListId].onicecandidate = function (event) {
            if (event.candidate != null) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          connections[socketListId].onaddstream = (event) => {
            let videoExists = videoRef.current.find(
              (video) => video.socketId === socketListId
            );

            if (videoExists) {
              setVideos((videos) => {
                const updatedVideos = videos.map((video) =>
                  video.socketId === socketListId
                    ? { ...video, stream: event.stream }
                    : video
                );
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            } else {
              let newVideo = {
                socketId: socketListId,
                stream: event.stream,
                autoplay: true,
                playsinline: true,
              };

              setVideos((videos) => {
                const updatedVideos = [...videos, newVideo];
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            }
          };

          if (window.localStream !== undefined && window.localStream !== null) {
            connections[socketListId].addStream(window.localStream);
          } else {
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            connections[socketListId].addStream(window.localStream);
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;

            try {
              connections[id2].addStream(window.localStream);
            } catch (e) {}

            connections[id2].createOffer().then((description) => {
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        }
      });
    });
  };

  const gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message);

    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then((description) => {
                  connections[fromId]
                    .setLocalDescription(description)
                    .then(() => {
                      socketRef.current.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        })
                      );
                    })
                    .catch((e) => console.log(e));
                })
                .catch((e) => console.log(e));
            }
          })
          .catch((e) => console.log(e));
      }

      if (signal.ice) {
        connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.log(e));
      }
    }
  };

  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  };

  const sendMessage = () => {
    if (socketRef.current && message.trim()) {
      socketRef.current.emit("chat-message", message, username);
      setMessage("");
    }
  };

  const handleVideo = () => {
    setVideo(!video);
  };

  const handleAudio = () => {
    setAudio(!audio);
  };

  const handleScreen = () => {
    setScreen(!screen);
  };

  const handleEndCall = () => {
    try {
      let tracks = localVideoref.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    } catch (e) {}
    window.location.href = "/";
  };

  const silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  const black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  return (
    <div>
      {askForUsername === true ? (
        <div>
          <h2>Enter into Lobby </h2>
          <TextField
            id="outlined-basic"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
          />
          <Button variant="contained" onClick={connect}>
            Connect
          </Button>

          <div>
            <video ref={localVideoref} autoPlay muted></video>
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          {/* Modern Chat Sidebar - Left Side */}
          {/* Modern Chat Sidebar - Right Side */}
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
                        {/* Sender Name */}
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

                        {/* Message Bubble */}
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
                              position: "relative",
                              "&::before":
                                item.sender === username
                                  ? {
                                      content: '""',
                                      position: "absolute",
                                      bottom: -6,
                                      right: 10,
                                      width: 12,
                                      height: 12,
                                      background:
                                        "linear-gradient(135deg, #4f46e5, #7c3aed)",
                                      transform: "rotate(45deg)",
                                      borderRadius: "2px",
                                    }
                                  : {
                                      content: '""',
                                      position: "absolute",
                                      bottom: -6,
                                      left: 10,
                                      width: 12,
                                      height: 12,
                                      background: "white",
                                      transform: "rotate(45deg)",
                                      borderRadius: "2px",
                                      borderLeft:
                                        "1px solid rgba(0, 0, 0, 0.1)",
                                      borderBottom:
                                        "1px solid rgba(0, 0, 0, 0.1)",
                                    },
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

                        {/* Message Time */}
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
            <IconButton onClick={handleVideo} style={{ color: "white" }}>
              {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={handleAudio} style={{ color: "white" }}>
              {audio === true ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            {screenAvailable === true ? (
              <IconButton onClick={handleScreen} style={{ color: "white" }}>
                {screen === true ? (
                  <ScreenShareIcon />
                ) : (
                  <StopScreenShareIcon />
                )}
              </IconButton>
            ) : (
              <></>
            )}

            <Badge badgeContent={newMessages} max={999} color="error">
              <IconButton
                onClick={() => {
                  setModal(!showModal);
                  setNewMessages(0);
                }}
                style={{ color: "white" }}>
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>

          {/* Local Video */}
          <video
            className={styles.meetUserVideo}
            ref={localVideoref}
            autoPlay
            muted></video>

          {/* Remote Videos */}
          <div className={styles.conferenceView}>
            {videos.map((video) => (
              <div key={video.socketId}>
                <video
                  data-socket={video.socketId}
                  ref={(ref) => {
                    if (ref && video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  autoPlay></video>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
