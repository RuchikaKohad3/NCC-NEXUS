import React from "react";
import { FaShieldAlt, FaUserTie, FaUsers } from "react-icons/fa";

const StructurePage = () => {
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
    // ✅ Added ID="structure" for scrolling
    <div className="page" id="structure">
      
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

      {/* ✅ FULL-WIDTH FOOTER */}
      <footer className="site-footer">
        <p>© 2024 NCC Nexus - National Cadet Corps Digital Command Center</p>
        <span>Unity and Discipline</span>
      </footer>
    </div>
  );
};

export default StructurePage;