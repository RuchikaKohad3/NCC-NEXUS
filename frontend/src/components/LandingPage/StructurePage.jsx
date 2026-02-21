import { useEffect } from "react";
import { FaShieldAlt, FaUserTie, FaUsers } from "react-icons/fa";

const StructurePage = () => {
  const cards = [
    {
      title: "ANO (Associate NCC Officer)",
      description: "Commanding Officers overseeing cadet operations",
      icon: <FaShieldAlt />,
      iconClass: "icon-saffron",
      cardClass: "card-saffron",
    },
    {
      title: "SUO (Senior Under Officer)",
      description: "Senior cadets leading their units",
      icon: <FaUserTie />,
      iconClass: "icon-blue",
      cardClass: "card-blue",
    },
    {
      title: "Cadets & Alumni",
      description: "Active members and veteran corps",
      icon: <FaUsers />,
      iconClass: "icon-blue",
      cardClass: "card-blue",
    },
  ];

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
      { threshold: 0.1 }
    );

    const section = document.getElementById("structure");
    if (section) {
      const els = section.querySelectorAll(".reveal, .reveal-scale, .reveal-left, .reveal-right");
      els.forEach((el) => observer.observe(el));
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="structure-section" id="structure">
      <main className="about">
        <div className="section-divider" />

        <header className="about-hero reveal">
          <h1>Organizational Structure</h1>
          <p>
            The NCC operates through a well-defined hierarchy ensuring efficient
            command and communication.
          </p>
        </header>

        <section className="about-grid structure-grid">
          {cards.map((card, index) => (
            <article
              key={index}
              className={`about-card structure-card ${card.cardClass} reveal-scale`}
              style={{ transitionDelay: `${index * 0.15}s` }}
            >
              <div className={`about-icon structure-icon ${card.iconClass}`}>
                {card.icon}
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </section>
      </main>

      {/* Motto + Wings + Footer */}
      <div className="motto-footer">
        <h3>Unity and Discipline</h3>
        <p className="motto-sub">Ekta Aur Anushasan</p>

        <div className="wing-row">
          <div className="wing-item">
            <span className="wing-dot red" />
            Army Wing
          </div>
          <div className="wing-item">
            <span className="wing-dot blue" />
            Naval Wing
          </div>
          <div className="wing-item">
            <span className="wing-dot navy" />
            Air Wing
          </div>
        </div>
      </div>

      <footer className="site-footer">
        <p>&copy; 2025 NCC Nexus — National Cadet Corps Digital Command Center</p>
      </footer>
    </div>
  );
};

export default StructurePage;
