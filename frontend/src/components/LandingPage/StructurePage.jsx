import React, { useState } from "react";
import { FaShieldAlt, FaUserTie, FaUsers } from "react-icons/fa";
import NavBar from "./NavBar";
import LoginModal from "./LoginModal";
import AnoLoginModal from "./AnoLoginModal";

const StructurePage = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showAnoLogin, setShowAnoLogin] = useState(false);
  const cards = [
    {
      title: "ANO (Associate NCC Officer)",
      description: "Commanding Officers overseeing cadet operations",
      icon: <FaShieldAlt />,
    },
    {
      title: "SUO (Senior Under Officer)",
      description: "Senior cadets leading their units",
      icon: <FaUserTie />,
    },
    {
      title: "Cadets & Alumni",
      description: "Active members and veteran corps",
      icon: <FaUsers />,
    },
  ];

  return (
    <div className="page">
      <NavBar
        onCadetLogin={() => setShowLogin(true)}
        onAnoLogin={() => setShowAnoLogin(true)}
      />

      {/* CONTENT WRAPPER */}
      <main className="about">
        <header className="about-hero">
          <h1>Organizational Structure</h1>
          <p>
            The NCC operates through a well-defined hierarchy ensuring efficient
            command and communication.
          </p>
        </header>

        <section className="about-grid structure-grid">
          {cards.map((card, index) => (
            <article key={index} className="about-card structure-card">
              <div className="about-icon structure-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </section>
      </main>

      {/* ✅ FULL-WIDTH FOOTER (CONTENT SE BAHAR) */}
      <footer className="site-footer">
        <p>© 2024 NCC Nexus - National Cadet Corps Digital Command Center</p>
        <span>Unity and Discipline</span>
      </footer>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showAnoLogin && (
        <AnoLoginModal onClose={() => setShowAnoLogin(false)} />
      )}
    </div>
  );
};

export default StructurePage;
