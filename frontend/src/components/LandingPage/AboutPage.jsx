import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { closeAboutCard, openAboutCard } from "../../features/ui/uiSlice";
import NavBar from "./NavBar";
import LoginModal from "./LoginModal";
import AnoLoginModal from "./AnoLoginModal";

const AboutPage = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showAnoLogin, setShowAnoLogin] = useState(false);
  const dispatch = useDispatch();
  const activeCard = useSelector((state) => state.ui.activeAboutCard);
  const cards = [
    {
      id: "discipline",
      title: "Discipline",
      description: "Instilling self-control, order, and a sense of responsibility in every cadet.",
    },
    {
      id: "unity",
      title: "Unity",
      description: "Building bonds that transcend boundaries and fostering national integration.",
    },
    {
      id: "leadership",
      title: "Leadership",
      description: "Developing future leaders who can guide and inspire others.",
    },
    {
      id: "service",
      title: "Service",
      description: "Dedication to serve the nation with selfless commitment and honor.",
    },
  ];

  const selectedCard = cards.find((card) => card.id === activeCard);

  return (
    <div className="page1">
      <NavBar
        onCadetLogin={() => setShowLogin(true)}
        onAnoLogin={() => setShowAnoLogin(true)}
      />

      <main className="about">
        <header className="about-hero">
          <h1>About the National Cadet Corps</h1>
          <p>
            The NCC is a youth development movement that molds character, discipline,
            and leadership qualities in young citizens of India.
          </p>
        </header>

        <section className="about-grid">
          {cards.map((card) => (
            <article
              key={card.id}
              className="about-card"
              role="button"
              tabIndex={0}
              onClick={() => dispatch(openAboutCard(card.id))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  dispatch(openAboutCard(card.id));
                }
              }}
            >
              <div className="about-icon">{card.title[0]}</div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </section>
      </main>

      {selectedCard ? (
        <div className="modal-backdrop" onClick={() => dispatch(closeAboutCard())}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{selectedCard.title}</h2>
              <button
                className="modal-close2"
                type="button"
                onClick={() => dispatch(closeAboutCard())}
              >
                Close
              </button>
            </div>
            <p>{selectedCard.description}</p>
          </div>
        </div>
      ) : null}

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showAnoLogin && (
        <AnoLoginModal onClose={() => setShowAnoLogin(false)} />
      )}
    </div>
  );
};

export default AboutPage;
