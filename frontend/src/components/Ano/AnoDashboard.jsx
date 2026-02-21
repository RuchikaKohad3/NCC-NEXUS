import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogOut } from "lucide-react";
import { closeAnoSidebar, toggleAnoSidebar } from "../../features/ui/uiSlice";
import Sidebar from "./SideBar";
import "./ano.css";

const AnoDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAnoSidebarOpen = useSelector((state) => state.ui.isAnoSidebarOpen);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "ANO") {
      navigate("/");
    }
  }, [navigate]);

  return (
    <div className="ano-dashboard-layout">
      {isAnoSidebarOpen ? (
        <button
          type="button"
          className="ano-sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={() => dispatch(closeAnoSidebar())}
        />
      ) : null}

      <Sidebar
        isOpen={isAnoSidebarOpen}
        onClose={() => dispatch(closeAnoSidebar())}
      />
      <main className="ano-dashboard-content">
        <div className="ano-tricolor-bar" />
        <div className="ano-topbar">
          <button
            type="button"
            className="ano-sidebar-toggle"
            aria-label="Toggle sidebar"
            onClick={() => dispatch(toggleAnoSidebar())}
          >
            Menu
          </button>
          <button
            className="topbar-logout"
            onClick={() => {
              dispatch(closeAnoSidebar());
              localStorage.removeItem("token");
              localStorage.removeItem("role");
              localStorage.removeItem("user");
              navigate("/");
            }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default AnoDashboard;
