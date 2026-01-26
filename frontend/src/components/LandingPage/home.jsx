import { useState } from "react";
import NavBar from "./NavBar";
import HeroSection from "./LandingPage";   // We will rename LandingPage to act as HeroSection
import AboutSection from "./AboutPage";     // We will rename AboutPage to act as AboutSection
import StructureSection from "./StructurePage"; // We will rename StructurePage to act as StructureSection
import LoginModal from "./LoginModal";
import AnoLoginModal from "./AnoLoginModal";

const Home = () => {
  // 1. Lift State Up: Manage Modals here, not inside sections
  const [showLogin, setShowLogin] = useState(false);
  const [showAnoLogin, setShowAnoLogin] = useState(false);

  return (
    <div className="home-container font-sans text-gray-800">
      
      {/* 2. Single NavBar for the whole page */}
      <NavBar 
        onCadetLogin={() => setShowLogin(true)} 
        onAnoLogin={() => setShowAnoLogin(true)} 
      />

      {/* 3. The Scrollable Sections */}
      <div className="sections-wrapper">
        <HeroSection 
          onCadetLogin={() => setShowLogin(true)} 
          onAnoLogin={() => setShowAnoLogin(true)}
        />
        <AboutSection />
        <StructureSection />
      </div>

      {/* 4. Modals live at the top level */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showAnoLogin && <AnoLoginModal onClose={() => setShowAnoLogin(false)} />}
      
    </div>
  );
};

export default Home;