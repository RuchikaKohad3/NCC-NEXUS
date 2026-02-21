import { useState, useEffect } from "react";
import { addCadetToAttendance } from "../attendanceStore";

const ROLES = ["Cadet", "SUO", "Alumni"];

const RANKS = [
  "Senior Under Officer",
  "Under Officer",
  "Company Sergeant Major",
  "Company Quarter Master Sergeant",
  "Sergeant",
  "Corporal",
  "Lance Corporal",
  "Cadet",
  "None",
];

const AddCadet = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    regimental_no: "",
    role: "",
    rank: "",
    joining_year: new Date().getFullYear().toString(),
  });

  const [joiningMonth, setJoiningMonth] = useState(`${new Date().getFullYear()}-01`);

  useEffect(() => {
    if (formData.joining_year) {
      setJoiningMonth(`${formData.joining_year}-01`);
    }
  }, [formData.joining_year]);

  useEffect(() => {
    if (formData.role === "Alumni") {
      setFormData((prev) => ({ ...prev, rank: "None" }));
    } else if (formData.role === "SUO") {
      setFormData((prev) => ({ ...prev, rank: "Senior Under Officer" }));
    }
  }, [formData.role]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.full_name || !formData.email || !formData.regimental_no || !formData.role || !formData.rank) {
      alert("Please fill all required fields");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch("http://localhost:5000/api/ano/cadets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        if (formData.role === "Cadet") {
          addCadetToAttendance(formData.full_name);
        }

        alert("Cadet added successfully!");
        setFormData({
          full_name: "",
          email: "",
          regimental_no: "",
          role: "",
          rank: "",
          joining_year: new Date().getFullYear().toString(),
        });
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error("API Error:", error);
      alert("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-cadet-container">
      <div className="page-header">
        <h1>Add Cadet</h1>
        <p>Manage your NCC unit effectively</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label>Full Name</label>
          <input name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Enter full name" />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input name="email" value={formData.email} onChange={handleChange} placeholder="cadet@example.com" />
        </div>

        <div className="form-group">
          <label>Regimental Number</label>
          <input name="regimental_no" value={formData.regimental_no} onChange={handleChange} placeholder="Enter regimental number" />
        </div>

        <div className="form-group">
          <label>Role</label>
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="">Select Role</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Rank</label>
          <select
            name="rank"
            value={formData.rank}
            onChange={handleChange}
            disabled={formData.role === "Alumni" || formData.role === "SUO"}
            style={{ backgroundColor: formData.role === "Alumni" || formData.role === "SUO" ? "#e9ecef" : "white" }}
          >
            <option value="">Select Rank</option>
            {RANKS
              .filter((rank) => formData.role !== "Cadet" || rank !== "Senior Under Officer")
              .map((rank) => (
              <option key={rank} value={rank}>
                {rank}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Year</label>
          <input
            type="month"
            name="joining_month"
            value={joiningMonth}
            onChange={(e) => {
              const monthVal = e.target.value;
              setJoiningMonth(monthVal);
              const yearOnly = monthVal ? monthVal.split("-")[0] : "";
              setFormData((prev) => ({ ...prev, joining_year: yearOnly }));
            }}
          />
        </div>

        <button className="primary-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Generating..." : "Generate Credentials"}
        </button>
      </div>
    </div>
  );
};

export default AddCadet;