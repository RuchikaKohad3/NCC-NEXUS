import React from 'react';
import { BrowserRouter, Route, Routes } from "react-router-dom";

// 1. Landing & Auth Imports
import Home from "./components/LandingPage/Home";
import LoginPage from "./components/LandingPage/LoginPage";
import AnoLogin from "./components/LandingPage/AnoLogin";

// 2. Cadet Module
import CadetDashboard from "./components/Cadet/CadetDashboard";
import Feed from "./components/Cadet/Feed";
import Chatbot from "./components/Cadet/Chatbot";
import CadetChat from "./components/Cadet/CadetChat";

// 3. SUO Module
import SUODashboard from "./components/SUO/dashboard";
import SUOChat from "./components/SUO/SUOChat";

// 4. Alumni Module
import AlumniDashboard from "./components/Alumni/dashboard";
import AlumniChat from "./components/Alumni/AlumniChat";

// 5. Ano Module
import AnoDashboard from "./components/Ano/AnoDashboard";
import AddCadet from "./components/Ano/AddCadet";
import ManageCadets from "./components/Ano/ManageCadets";
import AnoChat from "./components/Ano/AnoChat";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* LANDING PAGE */}
        <Route path="/" element={<Home />} />

        {/* AUTH ROUTES */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ano-login" element={<AnoLogin />} />

        {/* CADET ROUTES */}
        <Route path="/dashboard" element={<CadetDashboard />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/cadet/chat" element={<CadetChat />} />

        {/* SUO ROUTES */}
        <Route path="/suo-dashboard" element={<SUODashboard />} />
        <Route path="/suo/chat" element={<SUOChat />} />

        {/* ALUMNI ROUTES */}
        <Route path="/alumni-dashboard" element={<AlumniDashboard />} />
        <Route path="/alumni/chat" element={<AlumniChat />} />

        {/* ANO DASHBOARD ROUTES (Nested Layout) */}
        <Route path="/ano/*" element={<AnoDashboard />}>
          <Route index element={<AddCadet />} />
          <Route path="add-cadet" element={<AddCadet />} />
          <Route path="manage-cadets" element={<ManageCadets />} />
          <Route path="chat" element={<AnoChat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
