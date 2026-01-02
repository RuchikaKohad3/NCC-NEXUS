import { BrowserRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import AboutPage from "./components/AboutPage";
import StructurePage from "./components/StructurePage";
import LoginPage from "./components/LoginPage";
import AnoLogin from "./components/AnoLogin";
import CadetDashboard from "./components/CadetDashboard";
import Feed from "./components/Feed";
import Chatbot from "./components/Chatbot";
import AnoDashboard from "./components/Ano/AnoDashboard";
import AddCadet from "./components/Ano/AddCadet";
import ManageCadets from "./components/Ano/ManageCadets";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/structure" element={<StructurePage />} />
        {/* ✅ LOGIN PAGE ROUTE */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ano-login" element={<AnoLogin />} />
        <Route path="/dashboard" element={<CadetDashboard />} />
         <Route path="/feed" element={<Feed />} />
         <Route path="/chatbot" element={<Chatbot />} />

        {/* ✅ Dashboard */}
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
