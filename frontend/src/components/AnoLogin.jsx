import { useState } from "react";
import { FaArrowLeft, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import nccLogo from "./assets/ncc-logo.png";
import ResetPasswordModal from "./ResetPasswordModal";
import "/src/index.css";

const AnoLogin = ({ isModal = false }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const navigate = useNavigate();

  // 🔥 HANDLE LOGIN
  const handleLogin = () => {
    // 👉 yahan future me API / auth check aayega

    // ✅ Redirect to ANO Dashboard
    navigate("/ano");
  };

  return (
    <div className={isModal ? "ano-login-card" : "ano-login-page"}>

      {/* Back button ONLY for full page */}
      {!isModal && (
        <button className="back-home" onClick={() => navigate("/")}>
          <FaArrowLeft /> Back to Home
        </button>
      )}

      {/* Header */}
      <div className="ano-header">
        <div className="ano-icon">
          <img src={nccLogo} alt="NCC Logo" />
          <span className="alert-dot" />
        </div>

        <h1>ANO Login</h1>
        <p>Associate NCC Officer Access</p>
      </div>

      {/* Login Card */}
      <div className="ano-card">
        <div className="restricted-box">
          <FaLock />
          Restricted access for Authorized NCC Officers only
        </div>

        <label>Official Email</label>
        <input
          type="email"
          placeholder="officer@ncc.gov.in"
        />

        <label>Secure Password</label>
        <div className="password-box">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
          />

          {showPassword ? (
            <FaEyeSlash
              className="password-eye"
              onClick={() => setShowPassword(false)}
            />
          ) : (
            <FaEye
              className="password-eye"
              onClick={() => setShowPassword(true)}
            />
          )}
        </div>

        {/* 🔥 LOGIN BUTTON */}
        <button className="authorize-btn" onClick={handleLogin}>
          Authorize Access
        </button>
      </div>

      {/* Footer text */}
      <p className="ano-footer-text">
        This system is for authorized use only. All activities are monitored and logged.
      </p>

      {/* Reset Password Modal */}
      {showReset && (
        <ResetPasswordModal onClose={() => setShowReset(false)} />
      )}
    </div>
  );
};

export default AnoLogin;
