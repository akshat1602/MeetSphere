import React, { useContext, useState } from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";
import { Button, TextField } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import { AuthContext } from "../contexts/AuthContext";
import "../styles/home.css";

function HomeComponent() {
  const navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");
  const { addToUserHistory } = useContext(AuthContext);

  const handleJoinVideoCall = async () => {
    if (!meetingCode.trim()) return;
    await addToUserHistory(meetingCode);
    navigate(`/${meetingCode}`);
  };

  return (
    <div className="homePage">
      <div className="homeGradient" />

      <header className="homeNavbar">
        <div className="homeBrand">
          <h2>MeetSphere</h2>
          <span>Connect instantly, collaborate smoothly</span>
        </div>

        <div className="homeNavActions">
          <button className="historyBtn" onClick={() => navigate("/history")}>
            <RestoreIcon sx={{ fontSize: 20 }} />
            <span>History</span>
          </button>

          <Button
            className="logoutBtn"
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/auth");
            }}
          >
            Logout
          </Button>
        </div>
      </header>

      <main className="homeHero">
        <section className="homeLeft">
          <div className="heroBadge">Secure meeting access</div>

          <h1>Join your meeting space in seconds</h1>

          <p>
            Start or re-enter a room with a meeting code and continue your
            conversations with a cleaner, more modern workspace.
          </p>

          <div className="joinCard">
            <h3>Enter meeting code</h3>
            <div className="joinRow">
              <TextField
                fullWidth
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                label="Meeting Code"
                variant="outlined"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoinVideoCall();
                }}
              />
              <Button
                onClick={handleJoinVideoCall}
                variant="contained"
                className="joinBtn"
              >
                Join Now
              </Button>
            </div>
          </div>
        </section>

        <section className="homeRight">
          <div className="illustrationCard">
            <img src="/logo3.png" alt="Video meeting illustration" />
          </div>
        </section>
      </main>
    </div>
  );
}

export default withAuth(HomeComponent);