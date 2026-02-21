import { useEffect } from "react";
import { FaStar, FaUsers, FaFlag } from "react-icons/fa";
import logoImage from "../assets/ncc-logo.png";

const LandingPage = ({ onCadetLogin, onAnoLogin }) => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          } else {
            entry.target.classList.remove("revealed");
          }
        });
      },
      { threshold: 0.15 }
    );

    const els = document.querySelectorAll(".reveal, .reveal-scale, .reveal-left, .reveal-right");
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="hero-page" id="home">
      {/* Light fade on left side for text readability */}
      <div className="hero-left-fade" />

      <main className="hero-main">
        <section className="hero-content">
          <span className="hero-pill reveal-left">Official Digital Command Center</span>
          <h1 className="reveal-left" style={{ transitionDelay: ".1s" }}>NCC Nexus</h1>
          <p className="hero-tagline reveal-left" style={{ transitionDelay: ".2s" }}>
            Empowering Discipline Through Digital Command
          </p>
          <p className="hero-body reveal-left" style={{ transitionDelay: ".3s" }}>
            A centralized digital platform for NCC Cadets, SUOs, Alumni, and
            ANOs. Streamlining operations, enhancing communication, and
            fostering excellence in the National Cadet Corps.
          </p>

          <div className="hero-actions reveal-left" style={{ transitionDelay: ".4s" }}>
            <button className="primary" type="button" onClick={onCadetLogin}>
              Cadet Login
            </button>
            <button className="secondary" type="button" onClick={onAnoLogin}>
              ANO Login
            </button>
          </div>
        </section>

        <section className="hero-visual reveal-right" aria-hidden="true">
          <div className="glow-ring">
            <div className="logo-circle">
              <img src={logoImage} alt="" />
            </div>
          </div>
        </section>
      </main>

      {/* Stats */}
      <div className="hero-stats reveal" style={{ transitionDelay: ".5s" }}>
        <div className="stats-grid">
          <div className="stat-card reveal-scale" style={{ transitionDelay: ".6s" }}>
            <div className="stat-icon red"><FaStar /></div>
            <div className="stat-info">
              <div className="stat-number">Est. 1948</div>
              <div className="stat-label">Founded</div>
            </div>
          </div>
          <div className="stat-card reveal-scale" style={{ transitionDelay: ".7s" }}>
            <div className="stat-icon blue"><FaUsers /></div>
            <div className="stat-info">
              <div className="stat-number">14 Lakh+</div>
              <div className="stat-label">Active Cadets</div>
            </div>
          </div>
          <div className="stat-card reveal-scale" style={{ transitionDelay: ".8s" }}>
            <div className="stat-icon blue"><FaFlag /></div>
            <div className="stat-info">
              <div className="stat-number">3 Wings</div>
              <div className="stat-label">Army · Navy · Air</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Down */}
      <div className="scroll-indicator reveal">
        <span>Scroll Down</span>
        <div className="scroll-mouse">
          <div className="scroll-dot" />
        </div>
      </div>

      {/* Motto Banner */}
      <div className="motto-banner reveal">
        <h2>Unity and Discipline</h2>
        <p>Ekta Aur Anushasan</p>
      </div>
    </div>
  );
};

export default LandingPage;
