import { useDispatch, useSelector } from "react-redux";
import { closeAboutCard, openAboutCard } from "../../features/ui/uiSlice";

const AboutPage = () => {
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
    // ✅ Added ID="about" for scrolling
    <div className="page1" id="about">
      
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

      {/* Detail Modal Logic (Redux controlled) - Kept Local as it's specific to About */}
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
    </div>
  );
};

export default AboutPage;