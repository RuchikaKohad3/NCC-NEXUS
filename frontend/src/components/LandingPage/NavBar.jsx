import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // Keep useNavigate for login redirects
import logoImage from "../assets/ncc-logo.png";

const NavBar = ({ onCadetLogin, onAnoLogin }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll Handler
  const scrollToSection = (id) => {
    // If we are on the Home page ('/'), scroll. If not, go there first.
    if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
            const element = document.getElementById(id);
            if (element) element.scrollIntoView({ behavior: "smooth" });
        }, 100);
    } else {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Close dropdown on outside click (Keep your existing logic)
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
    <header className="nav fixed top-0 w-full z-50 transition-all duration-300">
      <div className="brand cursor-pointer" onClick={() => scrollToSection('home')}>
        <div className="brand-mark">
          <img src={logoImage} alt="NCC Nexus logo" />
        </div>
        <div className="brand-text">
          <span className="brand-title">NCC NEXUS</span>
          <span className="brand-subtitle">National Cadet Corps</span>
        </div>
      </div>

      <nav className="nav-links">
        {/* Update these to use onClick scroll */}
        <button onClick={() => scrollToSection('home')} className="nav-btn">Home</button>
        <button onClick={() => scrollToSection('about')} className="nav-btn">About NCC</button>
        <button onClick={() => scrollToSection('structure')} className="nav-btn">Structure</button>

        {/* LOGIN DROPDOWN (Keep your existing logic) */}
        <div className="login-dropdown" ref={dropdownRef}>
          <button className="nav-login" type="button" onClick={() => setOpen(!open)}>
            Login
          </button>

          {open && (
            <div className="login-menu">
              <button onClick={() => { setOpen(false); onCadetLogin(); }}>
                Cadet Login
              </button>
              <button onClick={() => { setOpen(false); onAnoLogin(); }}>
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