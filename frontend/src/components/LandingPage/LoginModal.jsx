import LoginPage from "./LoginPage";

const LoginModal = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Pass onClose to the page */}
        <LoginPage isModal={true} onClose={onClose} />
      </div>
    </div>
  );
};

export default LoginModal;