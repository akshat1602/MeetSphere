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

  const { handleRegister, handleLogin } = React.useContext(AuthContext);

  const handleAuth = async () => {
    try {
      if (formState === 0) {
        await handleLogin(username, password);
        setError("");
      } else {
        const result = await handleRegister(name, username, password);
        setUsername("");
        setPassword("");
        setName("");
        setMessage(result);
        setOpen(true);
        setError("");
        setFormState(0);
      }
    } catch (err) {
      console.log(err);
      const msg = err?.response?.data?.message || "Something went wrong";
      setError(msg);
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
          <span>Welcome to MeetSphere</span>
          <h2>Secure meetings with a cleaner experience</h2>
          <p>
            Join calls, chat in real time, and manage your meetings through a
            modern interface built for simplicity.
          </p>
        </div>
      </div>

      <div className="authFormPanel">
        <div className="authCard">
          <Avatar className="authAvatar">
            <LockOutlinedIcon />
          </Avatar>

          <h1>{formState === 0 ? "Welcome back" : "Create your account"}</h1>
          <p className="authSubtitle">
            {formState === 0
              ? "Sign in to continue to your meetings."
              : "Sign up to start using MeetSphere."}
          </p>

          <div className="authTabs">
            <button
              className={formState === 0 ? "active" : ""}
              onClick={() => setFormState(0)}
            >
              Sign In
            </button>
            <button
              className={formState === 1 ? "active" : ""}
              onClick={() => setFormState(1)}
            >
              Sign Up
            </button>
          </div>

          <div className="authForm">
            {formState === 1 && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="fullName"
                label="Full Name"
                name="fullName"
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
              value={username}
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
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="authError">{error}</p>}

            <Button
              type="button"
              fullWidth
              variant="contained"
              className="authButton"
              onClick={handleAuth}
            >
              {formState === 0 ? "Login" : "Register"}
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