import { NavLink, useNavigate } from "react-router-dom";
import { FaUserPlus, FaUsers, FaComments, FaSignOutAlt } from "react-icons/fa";
import nccLogo from "../assets/ncc-logo.png";

const Sidebar = ({ isOpen = true, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    if (typeof onClose === "function") onClose();

    navigate("/");
  };

  return (
    <aside className={`sidebar${isOpen ? " open" : ""}`}>
      <div className="sidebar-header">
        <img src={nccLogo} alt="NCC Logo" className="sidebar-logo" />
        <div>
          <h3>NCC NEXUS</h3>
          <span><h4>ANO Portal</h4></span>
        </div>
      </div>

      <nav className="menu">
        <NavLink
          to="add-cadet"
          className="menu-item"
          onClick={() => (typeof onClose === "function" ? onClose() : undefined)}
        >
          <FaUserPlus /> Add Cadet
        </NavLink>

        <NavLink
          to="manage-cadets"
          className="menu-item"
          onClick={() => (typeof onClose === "function" ? onClose() : undefined)}
        >
          <FaUsers /> Manage Cadets
        </NavLink>

          <NavLink
            to="ano-attendance"
            className="menu-item"
            onClick={() => (typeof onClose === "function" ? onClose() : undefined)}
          >
            <FaUsers /> Attendance
          </NavLink>

          <NavLink
            to="chat"
            className="menu-item"
            onClick={() => (typeof onClose === "function" ? onClose() : undefined)}
          >
            <FaComments /> Chat
          </NavLink>

        <button
          type="button"
          className="menu-item logout"
          onClick={handleLogout}
        >
          <FaSignOutAlt /> Logout
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
