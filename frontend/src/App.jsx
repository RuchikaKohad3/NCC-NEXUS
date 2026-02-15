import { BrowserRouter, Route, Routes } from "react-router-dom";

// ✅ 1. Landing & Auth Imports
import Home from "./components/LandingPage/Home";
import LoginPage from "./components/LandingPage/LoginPage";
import AnoLogin from "./components/LandingPage/AnoLogin";

// ✅ 2. Cadet Module
import CadetDashboard from "./components/Cadet/CadetDashboard";
// Import remaining Cadet components if they are used as standalone routes
import Feed from "./components/Cadet/Feed";
import Chatbot from "./components/Cadet/Chatbot";

// ✅ 3. SUO Module (New)
import SUODashboard from "./components/SUO/dashboard";

// ✅ 4. Alumni Module (New)
import AlumniDashboard from "./components/Alumni/dashboard";

// ✅ 5. Ano Module
import AnoDashboard from "./components/Ano/AnoDashboard";
import AddCadet from "./components/Ano/AddCadet";
import ManageCadets from "./components/Ano/ManageCadets";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ LANDING PAGE */}
        <Route path="/" element={<Home />} />

        {/* ✅ AUTH ROUTES */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ano-login" element={<AnoLogin />} />

        {/* ✅ CADET ROUTES */}
        <Route path="/dashboard" element={<CadetDashboard />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/chatbot" element={<Chatbot />} />

        {/* ✅ SUO ROUTES (New) */}
        <Route path="/suo-dashboard" element={<SUODashboard />} />

        {/* ✅ ALUMNI ROUTES (New) */}
        <Route path="/alumni-dashboard" element={<AlumniDashboard />} />

        {/* ✅ ANO DASHBOARD ROUTES */}
        <Route path="/ano/*" element={<AnoDashboard />}>
          <Route index element={<AddCadet />} /> {/* default page */}
          <Route path="add-cadet" element={<AddCadet />} />
          <Route path="manage-cadets" element={<ManageCadets />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
};

export default App; 