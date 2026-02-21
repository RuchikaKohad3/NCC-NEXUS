import { useEffect, useState } from "react";
import { FaUsers, FaUserCheck, FaUserShield, FaGraduationCap } from "react-icons/fa";
import "./anoDashboardHome.css";

const AnoDashboardHome = () => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suos: 0,
    alumni: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await fetch("http://localhost:5000/api/ano/cadets", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const cadets = Array.isArray(data) ? data : [];
          setStats({
            total: cadets.length,
            active: cadets.filter((c) => c.role === "Cadet").length,
            suos: cadets.filter((c) => c.role === "SUO").length,
            alumni: cadets.filter((c) => c.role === "Alumni").length,
          });
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="ano-home">
      <div className="ano-home-banner">
        <span className="ano-home-watermark">COMMAND CENTER</span>
        <div className="ano-home-banner-content">
          <h1>Welcome, Officer</h1>
          <p>ANO Command Center — Manage your NCC unit effectively</p>
          <span className="ano-home-motto">
            Unity and Discipline — Ekta Aur Anushasan
          </span>
        </div>
      </div>

      <div className="ano-home-divider" />

      <div className="ano-home-stats">
        <div className="ano-home-stat-card">
          <div className="ano-home-stat-icon ano-home-icon-navy">
            <FaUsers />
          </div>
          <div className="ano-home-stat-info">
            <h3>{stats.total}</h3>
            <p>Total Cadets</p>
          </div>
        </div>

        <div className="ano-home-stat-card">
          <div className="ano-home-stat-icon ano-home-icon-red">
            <FaUserCheck />
          </div>
          <div className="ano-home-stat-info">
            <h3>{stats.active}</h3>
            <p>Active Cadets</p>
          </div>
        </div>

        <div className="ano-home-stat-card">
          <div className="ano-home-stat-icon ano-home-icon-blue">
            <FaUserShield />
          </div>
          <div className="ano-home-stat-info">
            <h3>{stats.suos}</h3>
            <p>SUOs</p>
          </div>
        </div>

        <div className="ano-home-stat-card">
          <div className="ano-home-stat-icon ano-home-icon-indigo">
            <FaGraduationCap />
          </div>
          <div className="ano-home-stat-info">
            <h3>{stats.alumni}</h3>
            <p>Alumni</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnoDashboardHome;
