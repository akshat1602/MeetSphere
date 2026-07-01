import * as React from "react";
import { Avatar, Button, Snackbar, TextField } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { AuthContext } from "../contexts/AuthContext.jsx";
import "../styles/authentication.css";

export default function Authentication() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [formState, setFormState] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const { handleRegister, handleLogin } = React.useContext(AuthContext);

  const resetMessages = () => {
    setError("");
    setMessage("");
  };

  const handleAuth = async () => {
    resetMessages();

    if (formState === 1 && !name.trim()) {
      setError("Full name is required");
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }

    try {
      setLoading(true);

      if (formState === 0) {
        await handleLogin(username.trim(), password);
      } else {
        const result = await handleRegister(
          name.trim(),
          username.trim(),
          password
        );

        setUsername("");
        setPassword("");
        setName("");
        setMessage(result || "User registered successfully");
        setOpen(true);
        setFormState(0);
      }
    } catch (err) {
      console.log("AUTH ERROR:", err);
      console.log("AUTH ERROR RESPONSE:", err?.response);
      console.log("AUTH ERROR DATA:", err?.response?.data);

      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong";

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setOpen(false);
  };

  return (
    <div className="authPage">
      <div className="authVisualPanel">
        <div className="authVisualOverlay"></div>
        <img src="/mobile.png" alt="MeetSphere preview" />
        <div className="authVisualContent">
          <span>MeetSphere</span>
          <h2>Meet with clarity, not clutter</h2>
          <p>
            Secure calls, real-time chat, and a quieter interface designed to
            feel calm, minimal, and focused.
          </p>
        </div>
      </div>

      <div className="authFormPanel">
        <div className="authCard">
          <Avatar className="authAvatar">
            <LockOutlinedIcon />
          </Avatar>

          <h1>{formState === 0 ? "Welcome back" : "Create account"}</h1>
          <p className="authSubtitle">
            {formState === 0
              ? "Sign in to continue to your meetings."
              : "Create an account to start using MeetSphere."}
          </p>

          <div className="authTabs">
            <button
              type="button"
              className={formState === 0 ? "active" : ""}
              onClick={() => {
                setFormState(0);
                resetMessages();
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={formState === 1 ? "active" : ""}
              onClick={() => {
                setFormState(1);
                resetMessages();
              }}
            >
              Sign up
            </button>
          </div>

          <div className="authForm">
            {formState === 1 && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="fullName"
                label="Full name"
                name="fullName"
                placeholder="Enter your full name"
                value={name}
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
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              placeholder="Enter your password"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAuth();
                }
              }}
            />

            {error && <p className="authError">{error}</p>}

            <Button
              type="button"
              fullWidth
              variant="contained"
              className="authButton"
              onClick={handleAuth}
              disabled={loading}
            >
              {loading ? "Please wait..." : formState === 0 ? "Login" : "Register"}
            </Button>
          </div>
        </div>
      </div>

      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        message={message}
      />
    </div>
  );
}