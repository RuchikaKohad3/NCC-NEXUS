import AnoLogin from "./AnoLogin";

const AnoLoginModal = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* 🔥 CRITICAL FIX: Passing onClose prop to the child */}
        <AnoLogin isModal={true} onClose={onClose} />
        
      </div>
    </div>
  );
};

export default AnoLoginModal;