import { BrowserRouter, Route, Routes } from "react-router-dom";

// ✅ 1. LandingPage Module (Folder name is 'LandingPage')
import LandingPage from "./components/LandingPage/LandingPage";
import AboutPage from "./components/LandingPage/AboutPage";
import StructurePage from "./components/LandingPage/StructurePage";
import LoginPage from "./components/LandingPage/LoginPage";
import AnoLogin from "./components/LandingPage/AnoLogin";

// ✅ 2. Cadet Module (Folder name is 'Cadet')
import CadetDashboard from "./components/Cadet/CadetDashboard";
import Feed from "./components/Cadet/Feed";
import Chatbot from "./components/Cadet/Chatbot";

// ✅ 3. Ano Module (Folder name is 'Ano')
import AnoDashboard from "./components/Ano/AnoDashboard";
import AddCadet from "./components/Ano/AddCadet";
import ManageCadets from "./components/Ano/ManageCadets";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ LANDING & PUBLIC ROUTES */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/structure" element={<StructurePage />} />

        {/* ✅ AUTH ROUTES (Now inside LandingPage folder) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ano-login" element={<AnoLogin />} />

        {/* ✅ CADET ROUTES (Now inside Cadet folder) */}
        <Route path="/dashboard" element={<CadetDashboard />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/chatbot" element={<Chatbot />} />

        {/* ✅ ANO DASHBOARD ROUTES */}
        <Route path="/ano/*" element={<AnoDashboard />}>
          <Route index element={<AddCadet />} />   {/* default page */}
          <Route path="add-cadet" element={<AddCadet />} />
          <Route path="manage-cadets" element={<ManageCadets />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
};

export default App;