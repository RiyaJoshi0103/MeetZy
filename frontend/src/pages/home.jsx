import React, { useContext, useState } from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";
import {
  Button,
  IconButton,
  TextField,
  Box,
  Typography,
  Paper,
} from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import LogoutIcon from "@mui/icons-material/Logout";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import HistoryIcon from "@mui/icons-material/History";
import { AuthContext } from "../contexts/AuthContext";

function HomeComponent() {
  let navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");
  const { addToUserHistory, createMeeting, handleLogout } = useContext(AuthContext);

  let handleJoinVideoCall = async () => {
    if (!meetingCode.trim()) return;
    await addToUserHistory(meetingCode.trim().toUpperCase());
    navigate(`/${meetingCode.trim().toUpperCase()}`);
  };

  const handleCreateNewMeeting = async () => {
    try {
      const res = await createMeeting();
      if (res && res.meetingCode) {
        setMeetingCode(res.meetingCode);
      }
    } catch (err) {
      console.error("Failed to create new meeting:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Enhanced Navbar */}
      <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <VideoCallIcon className="text-white" />
              </div>
              <Typography
                variant="h5"
                className="font-bold text-white"
                sx={{
                  background: "linear-gradient(135deg, #fff 0%, #e0e7ff 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}>
                Meetzy
              </Typography>
            </div>

            {/* Navigation Items */}
            <div className="flex items-center space-x-4">
              <IconButton
                onClick={() => navigate("/history")}
                className="text-white hover:bg-white/20 transition-all duration-300"
                sx={{
                  color: "white",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    transform: "scale(1.1)",
                  },
                }}>
                <HistoryIcon />
              </IconButton>
              <Typography
                variant="body2"
                className="text-white font-medium hidden sm:block">
                History
              </Typography>

              <Button
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
                sx={{
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  fontWeight: 600,
                  textTransform: "none",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(10px)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    transform: "translateY(-1px)",
                  },
                  transition: "all 0.3s ease",
                }}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          {/* Left Panel - Enhanced */}
          <Box
            className="space-y-8"
            sx={{
              animation: "fadeInLeft 0.8s ease-out",
              "@keyframes fadeInLeft": {
                "0%": {
                  opacity: 0,
                  transform: "translateX(-30px)",
                },
                "100%": {
                  opacity: 1,
                  transform: "translateX(0)",
                },
              },
            }}>
            <Typography
              variant="h3"
              className="font-bold leading-tight"
              sx={{
                background:
                  "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                fontSize: { xs: "2rem", md: "3rem" },
                mb: 2,
              }}>
              Premium Video Calls
              <br />
              <span className="text-2xl md:text-3xl text-gray-600">
                Just Like Premium Experience
              </span>
            </Typography>

            <Typography
              variant="h6"
              className="text-gray-600 leading-relaxed"
              sx={{ mb: 4 }}>
              Connect with crystal-clear audio and video quality. Join meetings
              instantly or create your own with a single click.
            </Typography>

            {/* Enhanced Meeting Code Section */}
            <Paper
              elevation={8}
              sx={{
                p: 4,
                borderRadius: 4,
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}>
              <Typography
                variant="h6"
                className="font-semibold mb-4 text-gray-800">
                Enter Meeting Code
              </Typography>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <TextField
                  fullWidth
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value)}
                  placeholder="Enter meeting code"
                  variant="outlined"
                  size="medium"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      backgroundColor: "white",
                      "&:hover fieldset": {
                        borderColor: "#4f46e5",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#4f46e5",
                      },
                    },
                  }}
                />

                <div className="flex gap-3 w-full sm:w-auto">
                  <Button
                    onClick={handleJoinVideoCall}
                    disabled={!meetingCode.trim()}
                    variant="contained"
                    size="large"
                    sx={{
                      borderRadius: 3,
                      px: 4,
                      py: 1.5,
                      fontWeight: 700,
                      fontSize: "1rem",
                      background:
                        "linear-gradient(135deg, #000000 0%, #374151 100%)",
                      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)",
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #374151 0%, #000000 100%)",
                        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.4)",
                        transform: "translateY(-2px)",
                      },
                      "&:disabled": {
                        background: "grey.400",
                        transform: "none",
                        boxShadow: "none",
                      },
                      transition: "all 0.3s ease",
                      minWidth: "120px",
                    }}>
                    Join
                  </Button>

                  <Button
                    onClick={handleCreateNewMeeting}
                    variant="outlined"
                    size="large"
                    sx={{
                      borderRadius: 3,
                      px: 3,
                      py: 1.5,
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      borderColor: "#4f46e5",
                      color: "#4f46e5",
                      "&:hover": {
                        backgroundColor: "#4f46e5",
                        color: "white",
                        borderColor: "#4f46e5",
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.3s ease",
                      minWidth: "140px",
                    }}>
                    Create New
                  </Button>
                </div>
              </div>

              {meetingCode && (
                <Typography
                  variant="body2"
                  className="text-green-600 mt-3 font-medium">
                  Ready to join:{" "}
                  <span className="font-bold">{meetingCode}</span>
                </Typography>
              )}
            </Paper>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-600 text-sm font-bold">HD</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  HD Video
                </span>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 text-sm font-bold">🔒</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  Secure
                </span>
              </div>
            </div>
          </Box>

          {/* Right Panel - Enhanced */}
          <Box
            className="flex justify-center"
            sx={{
              animation: "fadeInRight 0.8s ease-out",
              "@keyframes fadeInRight": {
                "0%": {
                  opacity: 0,
                  transform: "translateX(30px)",
                },
                "100%": {
                  opacity: 1,
                  transform: "translateX(0)",
                },
              },
            }}>
            <div className="relative">
              <img
                src="/logo3.png"
                alt="Video Call Illustration"
                className="w-full max-w-md lg:max-w-lg transform hover:scale-105 transition-transform duration-500"
              />
              {/* Background Decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 rounded-3xl blur-3xl opacity-50 -z-10"></div>
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
}

export default withAuth(HomeComponent);
