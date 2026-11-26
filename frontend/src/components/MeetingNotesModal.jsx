import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Checkbox,
  Button,
  IconButton,
  CircularProgress,
  Box,
  Divider,
  Paper,
  Alert,
  Tooltip,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import { AuthContext } from "../contexts/AuthContext";

export default function MeetingNotesModal({
  open,
  onClose,
  meetingCode,
  socket = null,
}) {
  const { getMeetingNotes, generateMeetingNotes, updateActionItemStatus, askMeetingAI } =
    useContext(AuthContext);

  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [updatingTask, setUpdatingTask] = useState({});
  const [qaQuery, setQaQuery] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaAnswer, setQaAnswer] = useState(null);

  const fetchNotes = useCallback(async () => {
    if (!meetingCode) return;
    setLoading(true);
    setError("");
    try {
      const res = await getMeetingNotes(meetingCode);
      if (res && res.notes) {
        setNotes(res.notes);
      } else {
        setNotes(null);
      }
    } catch (err) {
      console.error("Error fetching notes:", err);
      setError("Failed to load meeting notes");
    } finally {
      setLoading(false);
    }
  }, [meetingCode, getMeetingNotes]);

  useEffect(() => {
    if (open && meetingCode) {
      fetchNotes();
    }
  }, [open, meetingCode, fetchNotes]);

  // Listen for socket real-time notes updates
  useEffect(() => {
    if (!socket) return;

    const handleNotesUpdated = (data) => {
      if (data?.meetingCode?.toUpperCase() === meetingCode?.toUpperCase() && data?.notes) {
        setNotes(data.notes);
      }
    };

    socket.on("notes-updated", handleNotesUpdated);
    return () => {
      socket.off("notes-updated", handleNotesUpdated);
    };
  }, [socket, meetingCode]);

  const handleGenerate = async () => {
    if (!meetingCode) return;
    setGenerating(true);
    setError("");
    try {
      const res = await generateMeetingNotes(meetingCode);
      if (res && res.notes) {
        setNotes(res.notes);
      }
    } catch (err) {
      console.error("Error generating notes:", err);
      setError(err.response?.data?.message || "Failed to generate meeting notes");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === "completed" ? "open" : "completed";
    
    // Optimistic UI update
    setNotes((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        actionItems: prev.actionItems.map((item) =>
          item.taskId === taskId ? { ...item, status: nextStatus } : item
        ),
      };
    });

    setUpdatingTask((prev) => ({ ...prev, [taskId]: true }));
    try {
      await updateActionItemStatus(meetingCode, taskId, nextStatus);
    } catch (err) {
      console.error("Failed to update task status:", err);
      // Revert optimistic update on failure
      fetchNotes();
    } finally {
      setUpdatingTask((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleAskAgent = async () => {
    if (!qaQuery.trim() || !meetingCode) return;
    setQaLoading(true);
    try {
      const res = await askMeetingAI(meetingCode, qaQuery.trim());
      setQaAnswer(res);
    } catch (err) {
      console.error("QA query error:", err);
    } finally {
      setQaLoading(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!notes) return;

    const dateStr = notes.createdAt ? new Date(notes.createdAt).toLocaleDateString() : "";
    let md = `# Meetzy Meeting Notes - ${meetingCode}\n\n`;
    md += `*Generated:* ${dateStr} | *Sentiment:* ${notes.sentiment || "neutral"}\n\n`;
    md += `## 📋 Executive Summary\n${notes.summary}\n\n`;

    if (notes.keyTopics && notes.keyTopics.length > 0) {
      md += `## 🏷️ Key Topics\n${notes.keyTopics.map((t) => `- ${t}`).join("\n")}\n\n`;
    }

    if (notes.decisions && notes.decisions.length > 0) {
      md += `## ⚖️ Key Decisions\n`;
      notes.decisions.forEach((d) => {
        md += `- **[Line ${d.transcriptLine}]** ${d.text} ${d.speaker ? `*(${d.speaker})*` : ""}\n`;
      });
      md += "\n";
    }

    if (notes.actionItems && notes.actionItems.length > 0) {
      md += `## ✅ Action Items & Tasks\n`;
      notes.actionItems.forEach((a) => {
        const check = a.status === "completed" ? "[x]" : "[ ]";
        const due = a.dueDate ? ` (Due: ${a.dueDate})` : "";
        md += `- ${check} **${a.task}** — Owner: @${a.owner}${due} *(Cited: Line ${a.transcriptLine})*\n`;
      });
      md += "\n";
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${meetingCode}-AI-Meeting-Notes.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
      case "constructive":
        return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
      case "mixed":
        return { bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
      default:
        return { bg: "#f3f4f6", color: "#4b5563", border: "#e5e7eb" };
    }
  };

  const sentimentStyle = getSentimentColor(notes?.sentiment);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          color: "#f8fafc",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          maxHeight: "90vh",
        },
      }}>
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1.5,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 15px rgba(99, 102, 241, 0.5)",
            }}>
            <AutoAwesomeIcon sx={{ color: "white", fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
              AI Meeting Notes & Action Items
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
              Room: <strong style={{ color: "#a5b4fc" }}>{meetingCode}</strong>
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          {notes && (
            <Chip
              label={notes.sentiment?.toUpperCase() || "NEUTRAL"}
              size="small"
              sx={{
                backgroundColor: sentimentStyle.bg,
                color: sentimentStyle.color,
                border: `1px solid ${sentimentStyle.border}`,
                fontWeight: 700,
                fontSize: "0.7rem",
              }}
            />
          )}
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "white" } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Body Content */}
      <DialogContent sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box py={8} textAlign="center">
            <CircularProgress size={36} sx={{ color: "#818cf8", mb: 2 }} />
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
              Loading structured meeting memory...
            </Typography>
          </Box>
        ) : !notes ? (
          <Box
            py={6}
            px={3}
            textAlign="center"
            sx={{
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: 3,
              border: "1px dashed rgba(255, 255, 255, 0.15)",
            }}>
            <AutoAwesomeIcon sx={{ fontSize: 48, color: "#818cf8", mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              No AI Notes Generated Yet
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.6)", mb: 3, maxWidth: 440, mx: "auto" }}>
              Meetzy analyzes your spoken meeting transcript, extracts key decisions with
              verified line citations, and assigns tracked action items automatically.
            </Typography>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={generating}
              startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
              sx={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 2,
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
              }}>
              {generating ? "Synthesizing Meeting Notes..." : "Generate AI Meeting Notes"}
            </Button>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={3}>
            {/* Executive Summary */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                background: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <LightbulbOutlinedIcon sx={{ color: "#fbbf24", fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                  Executive Summary
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "#cbd5e1", lineHeight: 1.6 }}>
                {notes.summary}
              </Typography>

              {/* Topics */}
              {notes.keyTopics && notes.keyTopics.length > 0 && (
                <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
                  {notes.keyTopics.map((topic, i) => (
                    <Chip
                      key={i}
                      label={`# ${topic}`}
                      size="small"
                      sx={{
                        background: "rgba(99, 102, 241, 0.15)",
                        color: "#a5b4fc",
                        border: "1px solid rgba(99, 102, 241, 0.3)",
                        fontSize: "0.75rem",
                      }}
                    />
                  ))}
                </Box>
              )}
            </Paper>

            {/* Decisions */}
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <FormatQuoteIcon sx={{ color: "#38bdf8", fontSize: 22 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                  Key Decisions ({notes.decisions?.length || 0})
                </Typography>
              </Box>

              {notes.decisions && notes.decisions.length > 0 ? (
                <Box display="flex" flexDirection="column" gap={1.5}>
                  {notes.decisions.map((decision, idx) => (
                    <Paper
                      key={idx}
                      elevation={0}
                      sx={{
                        p: 1.8,
                        borderRadius: 2.5,
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 2,
                      }}>
                      <Typography variant="body2" sx={{ color: "#e2e8f0", flex: 1 }}>
                        {decision.text}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
                        {decision.speaker && (
                          <Chip
                            label={decision.speaker}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: "0.7rem",
                              background: "rgba(255,255,255,0.08)",
                              color: "#94a3b8",
                            }}
                          />
                        )}
                        <Tooltip title="Exact transcript line cited by AI model">
                          <Chip
                            label={`Line ${decision.transcriptLine}`}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              background: "rgba(56, 189, 248, 0.15)",
                              color: "#38bdf8",
                              border: "1px solid rgba(56, 189, 248, 0.3)",
                            }}
                          />
                        </Tooltip>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  No explicit consensus decisions flagged in this session.
                </Typography>
              )}
            </Box>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

            {/* Action Items Checklist */}
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <AssignmentTurnedInIcon sx={{ color: "#10b981", fontSize: 22 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                  Action Items & Deliverables ({notes.actionItems?.length || 0})
                </Typography>
              </Box>

              {notes.actionItems && notes.actionItems.length > 0 ? (
                <Box display="flex" flexDirection="column" gap={1.2}>
                  {notes.actionItems.map((task) => {
                    const isCompleted = task.status === "completed";
                    return (
                      <Paper
                        key={task.taskId}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2.5,
                          background: isCompleted
                            ? "rgba(16, 185, 129, 0.05)"
                            : "rgba(15, 23, 42, 0.6)",
                          border: isCompleted
                            ? "1px solid rgba(16, 185, 129, 0.25)"
                            : "1px solid rgba(255, 255, 255, 0.06)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.2s ease",
                        }}>
                        <Box display="flex" alignItems="center" gap={1.5} flex={1}>
                          <Checkbox
                            checked={isCompleted}
                            onChange={() => handleToggleTask(task.taskId, task.status)}
                            disabled={updatingTask[task.taskId]}
                            icon={<RadioButtonUncheckedIcon sx={{ color: "rgba(255,255,255,0.4)" }} />}
                            checkedIcon={<CheckCircleOutlineIcon sx={{ color: "#10b981" }} />}
                            size="small"
                            sx={{ p: 0.5 }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: isCompleted ? "#64748b" : "#f1f5f9",
                              textDecoration: isCompleted ? "line-through" : "none",
                              fontWeight: isCompleted ? 400 : 500,
                            }}>
                            {task.task}
                          </Typography>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
                          {task.owner && (
                            <Chip
                              label={`@${task.owner}`}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                background: "rgba(99, 102, 241, 0.15)",
                                color: "#818cf8",
                              }}
                            />
                          )}
                          {task.dueDate && (
                            <Chip
                              label={task.dueDate}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                background: "rgba(245, 158, 11, 0.15)",
                                color: "#fbbf24",
                              }}
                            />
                          )}
                          <Tooltip title="Exact transcript line cited by AI model">
                            <Chip
                              label={`Line ${task.transcriptLine}`}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                background: "rgba(255, 255, 255, 0.08)",
                                color: "#94a3b8",
                              }}
                            />
                          </Tooltip>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  No open action items recorded.
                </Typography>
              )}
            </Box>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

            {/* In-Meeting AI Q&A Assistant Section */}
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <AutoAwesomeIcon sx={{ color: "#a855f7", fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                  Ask Meetzy AI Assistant
                </Typography>
              </Box>

              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  size="small"
                  value={qaQuery}
                  onChange={(e) => setQaQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && qaQuery.trim()) {
                      handleAskAgent();
                    }
                  }}
                  placeholder="Ask a question about this meeting (e.g. What did Priya propose?)..."
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      background: "rgba(15, 23, 42, 0.6)",
                      color: "white",
                      borderRadius: 2,
                      fontSize: "0.85rem",
                      "& fieldset": { borderColor: "rgba(255, 255, 255, 0.15)" },
                      "&:hover fieldset": { borderColor: "#a855f7" },
                      "&.Mui-focused fieldset": { borderColor: "#a855f7" },
                    },
                    "& .MuiInputBase-input": {
                      color: "white",
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAskAgent}
                  disabled={qaLoading || !qaQuery.trim()}
                  sx={{
                    background: "linear-gradient(135deg, #6366f1, #a855f7)",
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    px: 2.5,
                    whiteSpace: "nowrap",
                  }}>
                  {qaLoading ? <CircularProgress size={16} color="inherit" /> : "Ask"}
                </Button>
              </Box>

              {qaAnswer && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mt: 1.5,
                    borderRadius: 2.5,
                    background: "rgba(30, 27, 75, 0.7)",
                    border: "1px solid rgba(168, 85, 247, 0.35)",
                  }}>
                  <Typography variant="body2" sx={{ color: "#f1f5f9", lineHeight: 1.5, mb: 1 }}>
                    {qaAnswer.answer}
                  </Typography>
                  {qaAnswer.citations && qaAnswer.citations.length > 0 && (
                    <Box display="flex" flexWrap="wrap" gap={0.8} alignItems="center">
                      <Typography variant="caption" sx={{ color: "#a5b4fc", fontWeight: 600 }}>
                        Sources:
                      </Typography>
                      {qaAnswer.citations.map((c, i) => (
                        <Chip
                          key={i}
                          size="small"
                          label={`${c.speaker ? `${c.speaker} ` : ""}${c.line_number ? `[Line ${c.line_number}]` : ""}`}
                          sx={{
                            height: 20,
                            fontSize: "0.68rem",
                            background: "rgba(168, 85, 247, 0.2)",
                            color: "#d8b4fe",
                            border: "1px solid rgba(168, 85, 247, 0.4)",
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Footer Actions */}
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          justifyContent: "space-between",
        }}>
        <Box display="flex" alignItems="center" gap={1}>
          {notes && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleExportMarkdown}
              startIcon={<DownloadIcon />}
              sx={{
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: "white",
                textTransform: "none",
                borderRadius: 2,
                "&:hover": { borderColor: "white", background: "rgba(255,255,255,0.05)" },
              }}>
              Export Markdown (.md)
            </Button>
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          {notes && (
            <Button
              variant="contained"
              size="small"
              onClick={handleGenerate}
              disabled={generating}
              startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
              sx={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
              }}>
              {generating ? "Regenerating..." : "Regenerate Notes"}
            </Button>
          )}
          <Button
            onClick={onClose}
            size="small"
            sx={{
              color: "rgba(255, 255, 255, 0.7)",
              textTransform: "none",
              "&:hover": { color: "white" },
            }}>
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
