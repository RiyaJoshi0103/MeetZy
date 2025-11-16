import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import HomeIcon from "@mui/icons-material/Home";
import HistoryIcon from "@mui/icons-material/History";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { IconButton, Box, Grid, Paper, Container, Chip } from "@mui/material";

export default function History() {
  const { getHistoryOfUser } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const routeTo = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getHistoryOfUser();
        console.log("History fetched:", history);

        // Ensure meetings is always an array and sort by date (newest first)
        const sortedMeetings = Array.isArray(history)
          ? history.sort((a, b) => new Date(b.date) - new Date(a.date))
          : [];
        setMeetings(sortedMeetings);
      } catch (error) {
        console.error("Failed to fetch meeting history:", error);
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [getHistoryOfUser]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} at ${hours}:${minutes}`;
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return formatDate(dateString);
  };

  const handleMeetingClick = (meetingCode) => {
    routeTo(`/${meetingCode}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box textAlign="center" mt={8}>
            <Typography variant="h6" color="text.secondary">
              Loading your meeting history...
            </Typography>
          </Box>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <Box
        sx={{
          background:
            "linear-gradient(135deg, rgba(79, 70, 229, 0.95) 0%, rgba(124, 58, 237, 0.90) 50%, rgba(219, 39, 119, 0.85) 100%)",
          py: 2,
          mb: 4,
        }}>
        <Container maxWidth="lg">
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton
                onClick={() => routeTo("/home")}
                sx={{
                  color: "white",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.3)",
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.3s ease",
                }}>
                <HomeIcon />
              </IconButton>
              <Box display="flex" alignItems="center" gap={1}>
                <HistoryIcon sx={{ color: "white" }} />
                <Typography
                  variant="h5"
                  component="h1"
                  sx={{
                    color: "white",
                    fontWeight: 700,
                    background:
                      "linear-gradient(135deg, #fff 0%, #e0e7ff 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}>
                  Meeting History
                </Typography>
              </Box>
            </Box>
            <Chip
              label={`${meetings.length} meetings`}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "white",
                fontWeight: 600,
                backdropFilter: "blur(10px)",
              }}
            />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pb: 6 }}>
        {meetings.length !== 0 ? (
          <Grid container spacing={3}>
            {meetings.map((meeting, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card
                  elevation={4}
                  sx={{
                    borderRadius: 3,
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
                      borderColor: "#4f46e5",
                    },
                    animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                    "@keyframes fadeInUp": {
                      "0%": {
                        opacity: 0,
                        transform: "translateY(30px)",
                      },
                      "100%": {
                        opacity: 1,
                        transform: "translateY(0)",
                      },
                    },
                  }}
                  onClick={() => handleMeetingClick(meeting.meetingCode)}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          background:
                            "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                        }}>
                        <VideoCallIcon fontSize="small" />
                      </Box>
                      <Box>
                        <Typography
                          variant="h6"
                          component="h2"
                          sx={{
                            fontWeight: 700,
                            background:
                              "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                            backgroundClip: "text",
                            WebkitBackgroundClip: "text",
                            color: "transparent",
                          }}>
                          {meeting.meetingCode}
                        </Typography>
                        <Chip
                          label={getTimeAgo(meeting.date)}
                          size="small"
                          sx={{
                            backgroundColor: "grey.100",
                            color: "grey.700",
                            fontWeight: 500,
                            fontSize: "0.7rem",
                            height: 20,
                          }}
                        />
                      </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1} mt={2}>
                      <CalendarTodayIcon
                        sx={{
                          fontSize: 16,
                          color: "grey.500",
                        }}
                      />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.8rem" }}>
                        {formatDate(meeting.date)}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        mt: 2,
                        pt: 2,
                        borderTop: "1px solid",
                        borderColor: "grey.200",
                        textAlign: "center",
                      }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#4f46e5",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}>
                        Click to join again
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: "center",
              borderRadius: 4,
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              mt: 4,
            }}>
            <HistoryIcon
              sx={{
                fontSize: 64,
                color: "grey.400",
                mb: 2,
              }}
            />
            <Typography
              variant="h5"
              color="text.secondary"
              gutterBottom
              sx={{ fontWeight: 600 }}>
              No meetings yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your joined meetings will appear here
            </Typography>
            <IconButton
              onClick={() => routeTo("/home")}
              sx={{
                backgroundColor: "primary.main",
                color: "white",
                "&:hover": {
                  backgroundColor: "primary.dark",
                  transform: "scale(1.1)",
                },
                transition: "all 0.3s ease",
              }}>
              <VideoCallIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Start your first meeting
            </Typography>
          </Paper>
        )}
      </Container>
    </div>
  );
}
