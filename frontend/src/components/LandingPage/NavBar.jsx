import { useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import logoImage from "../assets/ncc-logo.png";

const NavBar = ({ onCadetLogin, onAnoLogin }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="nav">
      <div className="brand">
        <div className="brand-mark">
          <img src={logoImage} alt="NCC Nexus logo" />
        </div>
        <div className="brand-text">
          <span className="brand-title">NCC NEXUS</span>
          <span className="brand-subtitle">National Cadet Corps</span>
        </div>
      </div>

      <nav className="nav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
          Home
        </NavLink>

        <NavLink to="/about" className={({ isActive }) => (isActive ? "active" : undefined)}>
          About NCC
        </NavLink>

        <Link to="/structure">Structure</Link>

        {/* LOGIN DROPDOWN */}
        <div className="login-dropdown" ref={dropdownRef}>
          <button
            className="nav-login"
            type="button"
            onClick={() => setOpen(!open)}
          >
            Login
          </button>

          {open && (
            <div className="login-menu">
              <button
                onClick={() => {
                  setOpen(false);
                  if (typeof onCadetLogin === "function") onCadetLogin();
                  else navigate("/login");
                }}
              >
                Cadet Login
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  if (typeof onAnoLogin === "function") onAnoLogin();
                  else navigate("/ano-login");
                }}
              >
                ANO Login
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default NavBar;
