import React from "react";
import "../App.css";
import { Link, useNavigate } from "react-router-dom";

export default function LandingPage() {
  const router = useNavigate();

  return (
    <div className="landingPageContainer">
      <nav className="landingNav">
        <div className="navHeader">
          <h2>MeetSphere</h2>
        </div>

        <div className="navlist">
          <p
            onClick={() => {
              router("/aljk23");
            }}
          >
            Join as Guest
          </p>

          <p
            onClick={() => {
              router("/auth");
            }}
          >
            Register
          </p>

          <div
            className="navButton"
            onClick={() => {
              router("/auth");
            }}
            role="button"
          >
            <p>Login</p>
          </div>
        </div>
      </nav>

      <div className="landingMainContainer">
        <div className="landingText">
          <span className="landingHeroBadge">Simple video meetings</span>

          <h1>
            Meet without the <span>distance</span>
          </h1>

          <p>
            A simple, reliable place for video calls, chat, and meeting history
            — designed for a smoother everyday experience.
          </p>

          <div className="heroActions">
            <Link className="primaryBtn" to="/auth">
              Get Started
            </Link>

            <button
              className="secondaryBtn"
              onClick={() => {
                router("/aljk23");
              }}
            >
              Join as Guest
            </button>
          </div>
        </div>

        <div className="landingVisual">
          <div className="visualGlow"></div>
          <img src="/mobile.png" alt="MeetSphere app preview" />
        </div>
      </div>
    </div>
  );
}