import LoginPage from "./LoginPage";

const LoginModal = ({ onClose }) => {
  return (
    <div className="modal-overlay cadet-login-modal" onClick={onClose}>
      <div className="modal-content cadet-login-content" onClick={(e) => e.stopPropagation()}>
        <LoginPage isModal={true} onClose={onClose} />
      </div>
    </div>
  );
};

export default LoginModal;