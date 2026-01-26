import { useState } from "react";
import { FaMedal, FaLock, FaTimes } from "react-icons/fa"; // Import FaTimes (Cross Icon)
import { useNavigate } from "react-router-dom";
import nccLogo from "../assets/ncc-logo.png";

// ✅ Accept onClose prop
const LoginPage = ({ isModal = false, onClose }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState("CADET");

  const handleLogin = () => {
    if (role === "CADET") navigate("/dashboard");
    else alert("Dashboard under construction");
  };

  const card = (
    <div className="login-card">
      {/* ✅ CLOSE BUTTON (Only show if isModal is true) */}
      {isModal && (
        <button className="card-close-btn" onClick={onClose}>
          <FaTimes />
        </button>
      )}

      {/* 1. Glow Effect */}
      <span className="card-glow" />

      {/* 2. Logo & Header */}
      <img src={nccLogo} alt="NCC Logo" className="login-logo" />
      <h1 className="login-title">NCC NEXUS</h1>
      
      {/* 3. Role Switcher */}
      <div className="role-select">
        {["CADET", "SUO", "ALUMNI"].map((item) => (
          <button
            key={item}
            className={role === item ? "active" : ""}
            onClick={() => setRole(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      {/* 4. Inputs */}
      <div className="login-form">
        <div className="input-wrapper">
          <div className="input-group has-icon">
            <FaMedal className="input-icon" />
            <input type="text" placeholder="Regimental Number" />
          </div>
        </div>

        <div className="input-wrapper">
          <div className="input-group has-icon">
            <FaLock className="input-icon" />
            <input type="password" placeholder="Password" />
          </div>
        </div>

        <button className="login-btn" onClick={handleLogin}>
          LOGIN
        </button>
      </div>
    </div>
  );

  return isModal ? card : <div className="login-page">{card}</div>;
};

export default LoginPage;