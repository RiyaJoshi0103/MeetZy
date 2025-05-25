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

const defaultTheme = createTheme();

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
    <ThemeProvider theme={defaultTheme}>
      <Grid container component="main" sx={{ height: "100vh" }}>
        <CssBaseline />

        {/* Left side - image */}
        <Grid
          item
          xs={false}
          sm={4}
          md={7}
          sx={{
            backgroundImage:
              "url(https://source.unsplash.com/random?wallpapers)",
            backgroundRepeat: "no-repeat",
            backgroundColor: (t) =>
              t.palette.mode === "light"
                ? t.palette.grey[50]
                : t.palette.grey[900],
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.85)",
          }}
        />

        {/* Right side - form */}
        <Grid
          item
          xs={12}
          sm={8}
          md={5}
          component={Paper}
          elevation={10}
          square>
          <Box
            sx={{
              my: 10,
              mx: 6,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              animation: "fadeIn 0.8s ease-in",
              "@keyframes fadeIn": {
                "0%": { opacity: 0, transform: "translateY(10px)" },
                "100%": { opacity: 1, transform: "translateY(0)" },
              },
            }}>
            <Avatar
              sx={{
                m: 1,
                bgcolor: "secondary.main",
                boxShadow: "0 0 8px #D35400",
              }}
              aria-label="lock icon">
              <LockOutlinedIcon />
            </Avatar>

            <Typography
              component="h1"
              variant="h5"
              sx={{ mb: 3, fontWeight: "600" }}>
              {formState === 0 ? "Sign In to Meetzy" : "Create an Account"}
            </Typography>

            {/* Toggle buttons for Sign In / Sign Up */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                mb: 3,
                borderRadius: 1,
                backgroundColor: "#f0f0f0",
                p: 0.5,
              }}>
              <Button
                fullWidth
                variant={formState === 0 ? "contained" : "text"}
                color="primary"
                onClick={() => {
                  setFormState(0);
                  setError("");
                }}
                sx={{
                  fontWeight: "600",
                  borderRadius: 2,
                  textTransform: "none",
                  boxShadow:
                    formState === 0
                      ? "0 4px 12px rgba(230,126,34,0.5)"
                      : "none",
                  transition: "all 0.3s ease",
                }}>
                Sign In
              </Button>

              <Button
                fullWidth
                variant={formState === 1 ? "contained" : "text"}
                color="primary"
                onClick={() => {
                  setFormState(1);
                  setError("");
                }}
                sx={{
                  fontWeight: "600",
                  borderRadius: 2,
                  textTransform: "none",
                  boxShadow:
                    formState === 1
                      ? "0 4px 12px rgba(230,126,34,0.5)"
                      : "none",
                  transition: "all 0.3s ease",
                }}>
                Sign Up
              </Button>
            </Box>

            <Box component="form" noValidate sx={{ mt: 1, width: "100%" }}>
              {formState === 1 && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="name"
                  label="Full Name"
                  name="name"
                  value={name}
                  autoComplete="name"
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                />
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                value={username}
                autoComplete="username"
                autoFocus={formState === 0}
                onChange={(e) => setUsername(e.target.value)}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />

              {error && (
                <Typography
                  variant="body2"
                  sx={{ color: "error.main", mt: 1, mb: 1, fontWeight: "500" }}>
                  {error}
                </Typography>
              )}

              <Button
                type="button"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  mb: 2,
                  background:
                    "linear-gradient(45deg, #E67E22 30%, #D35400 90%)",
                  boxShadow: "0 4px 15px rgba(230, 126, 34, 0.6)",
                  fontWeight: "700",
                  fontSize: "1.1rem",
                  "&:hover": {
                    background:
                      "linear-gradient(45deg, #D35400 30%, #E67E22 90%)",
                    boxShadow: "0 6px 20px rgba(211, 84, 0, 0.8)",
                  },
                }}
                onClick={handleAuth}>
                {formState === 0 ? "Login" : "Register"}
              </Button>
            </Box>
          </Box>
        </Grid>

        <Snackbar
          open={open}
          autoHideDuration={4000}
          onClose={() => setOpen(false)}
          message={message}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        />
      </Grid>
    </ThemeProvider>
  );
}
