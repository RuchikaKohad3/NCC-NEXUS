import { useEffect } from "react";
import { FaShieldAlt, FaHeart, FaStar, FaHandsHelping } from "react-icons/fa";

const AboutPage = () => {
  const cards = [
    {
      id: "discipline",
      title: "Discipline",
      icon: <FaShieldAlt />,
      iconClass: "icon-saffron",
      cardClass: "card-saffron",
      description:
        "Instilling self-control, order, and a sense of responsibility in every cadet.",
      detail:
        "Discipline is the cornerstone of NCC training. From drill parades to adventure activities, every aspect of NCC life builds self-control, time management, and respect for authority.",
    },
    {
      id: "unity",
      title: "Unity",
      icon: <FaHeart />,
      iconClass: "icon-blue",
      cardClass: "card-blue",
      description:
        "Building bonds that transcend boundaries and fostering national integration.",
      detail:
        "NCC brings together youth from diverse backgrounds under one flag. Through camps, parades, and community service, cadets learn to work as one unit.",
    },
    {
      id: "leadership",
      title: "Leadership",
      icon: <FaStar />,
      iconClass: "icon-blue",
      cardClass: "card-blue",
      description:
        "Developing future leaders who can guide and inspire others.",
      detail:
        "From cadet to SUO, young leaders learn to command respect, make decisions under pressure, and take ownership of their responsibilities.",
    },
    {
      id: "service",
      title: "Service",
      icon: <FaHandsHelping />,
      iconClass: "icon-saffron",
      cardClass: "card-saffron",
      description:
        "Dedication to serve the nation with selfless commitment and honor.",
      detail:
        "Through community development, disaster relief, and blood donation drives, cadets put the needs of the nation first. Service before self.",
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

    const section = document.getElementById("about");
    if (section) {
      const els = section.querySelectorAll(".reveal, .reveal-scale, .reveal-left, .reveal-right");
      els.forEach((el) => observer.observe(el));
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="about-section" id="about">
      <main className="about">
        <div className="section-divider" />

        <header className="about-hero reveal">
          <h1>About the National Cadet Corps</h1>
          <p>
            The NCC is a youth development movement that molds character, discipline,
            and leadership qualities in young citizens of India.
          </p>
        </header>

        <section className="about-grid">
          {cards.map((card, idx) => (
            <div key={card.id} className={`flip-card ${idx % 2 === 0 ? "reveal-left" : "reveal-right"}`} style={{ transitionDelay: `${idx * 0.12}s` }}>
              <div className="flip-card-inner">
                {/* Front face */}
                <div className={`flip-card-front ${card.cardClass}`}>
                  <div className={`about-icon ${card.iconClass}`}>{card.icon}</div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
                {/* Back face — revealed on hover */}
                <div className="flip-card-back">
                  <h3>{card.title}</h3>
                  <p>{card.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default AboutPage;
