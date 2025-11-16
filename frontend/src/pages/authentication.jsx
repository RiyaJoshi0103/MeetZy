import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { AuthContext } from "../contexts/AuthContext";
import Snackbar from "@mui/material/Snackbar";
import Navbar from "../Navbar";
import Footer from "../footer";

// Custom theme matching your blue-purple gradient
const theme = createTheme({
  palette: {
    primary: {
      main: "#4f46e5", // Indigo
      light: "#6366f1",
      dark: "#4338ca",
    },
    secondary: {
      main: "#7c3aed", // Purple
    },
    background: {
      default: "#f8fafc",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.9rem",
          padding: "10px 20px",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
            fontSize: "0.9rem",
            "&:hover fieldset": {
              borderColor: "#4f46e5",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#4f46e5",
            },
          },
        },
      },
    },
  },
});

export default function Authentication() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [formState, setFormState] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const { handleRegister, handleLogin } = React.useContext(AuthContext);

  const handleAuth = async () => {
    try {
      if (formState === 0) {
        await handleLogin(username, password);
      } else {
        const result = await handleRegister(name, username, password);
        setMessage(result);
        setOpen(true);
        setError("");
        setFormState(0);
        setUsername("");
        setPassword("");
        setName("");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="min-h-screen">
        {/* Header */}
        <Navbar />

        {/* Full Screen Background with Centered Form - Added top spacing */}
        <div
          className="min-h-screen pt-16" // Added padding top to create space below navbar
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(79, 70, 229, 0.9) 0%, rgba(124, 58, 237, 0.85) 50%, rgba(219, 39, 119, 0.8) 100%), url(https://images.unsplash.com/photo-1581276879432-15e50529f34b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundBlendMode: "overlay",
          }}>
          <Grid
            container
            sx={{
              minHeight: "calc(100vh - 180px)", // Adjusted height to account for navbar + top padding
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <CssBaseline />

            {/* Centered Authentication Form - Smaller Size */}
            <Grid
              item
              xs={11}
              sm={8}
              md={5}
              lg={3}
              xl={2}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 2,
              }}>
              <Paper
                elevation={16}
                sx={{
                  width: "100%",
                  maxWidth: 380,
                  p: 3,
                  borderRadius: 3,
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  animation: "fadeInUp 0.8s ease-out",
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
                }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}>
                  {/* Smaller Avatar */}
                  <Avatar
                    sx={{
                      m: 1,
                      bgcolor: "primary.main",
                      width: 50,
                      height: 50,
                      boxShadow: "0 6px 20px rgba(79, 70, 229, 0.3)",
                    }}
                    aria-label="lock icon">
                    <LockOutlinedIcon fontSize="medium" />
                  </Avatar>

                  {/* Smaller Heading */}
                  <Typography
                    component="h1"
                    variant="h5"
                    sx={{
                      mb: 2,
                      fontWeight: 700,
                      background:
                        "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)",
                      backgroundClip: "text",
                      textFillColor: "transparent",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}>
                    {formState === 0 ? "Welcome Back" : "Join Meetzy"}
                  </Typography>

                  {/* Toggle buttons - Smaller */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      mb: 3,
                      borderRadius: 2,
                      backgroundColor: "grey.50",
                      p: 0.5,
                      width: "100%",
                    }}>
                    <Button
                      fullWidth
                      variant={formState === 0 ? "contained" : "text"}
                      onClick={() => {
                        setFormState(0);
                        setError("");
                      }}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        py: 1,
                        boxShadow:
                          formState === 0
                            ? "0 2px 8px rgba(79, 70, 229, 0.3)"
                            : "none",
                        transition: "all 0.3s ease",
                      }}>
                      Sign In
                    </Button>

                    <Button
                      fullWidth
                      variant={formState === 1 ? "contained" : "text"}
                      onClick={() => {
                        setFormState(1);
                        setError("");
                      }}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        py: 1,
                        boxShadow:
                          formState === 1
                            ? "0 2px 8px rgba(124, 58, 237, 0.3)"
                            : "none",
                        transition: "all 0.3s ease",
                      }}>
                      Sign Up
                    </Button>
                  </Box>

                  <Box
                    component="form"
                    noValidate
                    sx={{ mt: 1, width: "100%" }}>
                    {formState === 1 && (
                      <TextField
                        margin="dense"
                        required
                        fullWidth
                        id="name"
                        label="Full Name"
                        name="name"
                        value={name}
                        autoComplete="name"
                        autoFocus
                        size="small"
                        onChange={(e) => setName(e.target.value)}
                      />
                    )}

                    <TextField
                      margin="dense"
                      required
                      fullWidth
                      id="username"
                      label="Email Address"
                      name="username"
                      value={username}
                      autoComplete="email"
                      autoFocus={formState === 0}
                      size="small"
                      onChange={(e) => setUsername(e.target.value)}
                    />

                    <TextField
                      margin="dense"
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type="password"
                      id="password"
                      value={password}
                      autoComplete="current-password"
                      size="small"
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    {error && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: "error.main",
                          mt: 1.5,
                          mb: 1,
                          fontWeight: 500,
                          textAlign: "center",
                          p: 1,
                          fontSize: "0.8rem",
                          backgroundColor: "rgba(211, 47, 47, 0.1)",
                          borderRadius: 1,
                        }}>
                        {error}
                      </Typography>
                    )}

                    {/* Smaller Button */}
                    <Button
                      type="button"
                      fullWidth
                      variant="contained"
                      sx={{
                        mt: 2,
                        mb: 1,
                        background:
                          "linear-gradient(135deg, #000000 0%, #374151 100%)",
                        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        py: 1.2,
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #374151 0%, #000000 100%)",
                          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
                          transform: "translateY(-1px)",
                        },
                        transition: "all 0.3s ease",
                      }}
                      onClick={handleAuth}>
                      {formState === 0 ? "Sign In" : "Create Account"}
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </div>

        {/* Footer */}
        <Footer />

        <Snackbar
          open={open}
          autoHideDuration={4000}
          onClose={() => setOpen(false)}
          message={message}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        />
      </div>
    </ThemeProvider>
  );
}
