import { useState } from "react";
import NavBar from "./NavBar";
import HeroSection from "./LandingPage";
import AboutSection from "./AboutPage";
import StructureSection from "./StructurePage";
import LoginModal from "./LoginModal";
import AnoLoginModal from "./AnoLoginModal";
import paradeImage from "../assets/ncc-parade.jpeg";

const Home = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showAnoLogin, setShowAnoLogin] = useState(false);

  return (
    <div className="home-container">

      {/* Fixed parade background covering entire page */}
      <div className="page-bg">
        <img src={paradeImage} alt="" aria-hidden="true" />
        <div className="page-bg-overlay" />
      </div>

      {/* Floating particles */}
      <div className="particles">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>

      <NavBar
        onCadetLogin={() => setShowLogin(true)}
        onAnoLogin={() => setShowAnoLogin(true)}
      />

      <div className="sections-wrapper">
        <HeroSection
          onCadetLogin={() => setShowLogin(true)}
          onAnoLogin={() => setShowAnoLogin(true)}
        />
        <AboutSection />
        <StructureSection />
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showAnoLogin && <AnoLoginModal onClose={() => setShowAnoLogin(false)} />}
    </div>
  );
};

export default Home;
