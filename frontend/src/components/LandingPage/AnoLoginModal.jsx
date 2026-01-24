import AnoLogin from "./AnoLogin";

const AnoLoginModal = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card ano-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button className="modal-close3" onClick={onClose}>
          ✕
        </button>

        <AnoLogin isModal />
      </div>
    </div>
  );
};

export default AnoLoginModal;
