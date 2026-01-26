import { BrowserRouter, Route, Routes } from "react-router-dom";

// ✅ 1. Import the New Master Home Component
import Home from "./components/LandingPage/Home";

// ✅ 2. Auth Routes (Still needed as separate pages for direct access)
import LoginPage from "./components/LandingPage/LoginPage";
import AnoLogin from "./components/LandingPage/AnoLogin";

// ✅ 3. Cadet Module
import CadetDashboard from "./components/Cadet/CadetDashboard";
import Feed from "./components/Cadet/Feed";
import Chatbot from "./components/Cadet/Chatbot";

// ✅ 4. Ano Module
import AnoDashboard from "./components/Ano/AnoDashboard";
import AddCadet from "./components/Ano/AddCadet";
import ManageCadets from "./components/Ano/ManageCadets";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ SINGLE PAGE ROUTE (Ab Home.jsx sab handle karega) */}
        <Route path="/" element={<Home />} />

        {/* ❌ REMOVED: /about aur /structure ab alag pages nahi hain */}
        
        {/* ✅ AUTH ROUTES */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ano-login" element={<AnoLogin />} />

        {/* ✅ CADET DASHBOARD ROUTES */}
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