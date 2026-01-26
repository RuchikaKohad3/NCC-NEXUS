import { useState } from "react";
import logoImage from "../assets/ncc-logo.png";

// ✅ Accept props from Home.jsx to trigger modals
const LandingPage = ({ onCadetLogin, onAnoLogin }) => {
  return (
    // ✅ Added ID="home" for scrolling
    <div className="page" id="home">

      <main className="hero">
        <section className="hero-content">
          <span className="hero-pill">Official Digital Command Center</span>
          <h1>NCC Nexus</h1>
          <p className="hero-tagline">
            Empowering Discipline Through Digital Command
          </p>
          <p className="hero-body">
            A centralized digital platform for NCC Cadets, SUOs, Alumni, and ANOs.
            Streamlining operations, enhancing communication, and fostering excellence
            in the National Cadet Corps.
          </p>

          <div className="hero-actions">
            {/* ✅ Calls function passed from Home.jsx */}
            <button
              className="primary"
              type="button"
              onClick={onCadetLogin}
            >
              Cadet Login
            </button>

            {/* ✅ Calls function passed from Home.jsx */}
            <button
              className="secondary"
              type="button"
              onClick={onAnoLogin}
            >
              ANO Login
            </button>
          </div>
        </section>

        <section className="hero-visual" aria-hidden="true">
          <div className="glow-ring">
            <div className="logo-circle">
              <img src={logoImage} alt="" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;