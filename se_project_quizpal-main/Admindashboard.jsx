import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function AdminDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("isAdmin") !== "true") {
      navigate("/admin/login");
      return;
    }

    const fetchProgress = async () => {
      try {
        // Fetch all student progress (you can modify this API endpoint)
        const res = await api.get("/admin/data");
        setData(res.data || []);
      } catch (err) {
        console.error("Failed to fetch admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("authToken");
    navigate("/admin/login");
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading student progress...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "1rem" }}>Admin Dashboard</h1>
      <button
        onClick={handleLogout}
        style={{
          background: "#dc2626",
          color: "white",
          padding: "0.6rem 1rem",
          border: "none",
          borderRadius: "0.4rem",
          cursor: "pointer",
          float: "right"
        }}
      >
        Logout
      </button>

      <p>Welcome, Admin 👋 — here’s the student progress data.</p>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "1.5rem",
          backgroundColor: "#fff",
          borderRadius: "10px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
        }}
      >
        <thead style={{ background: "#059669", color: "#fff" }}>
          <tr>
            <th style={{ padding: "10px", textAlign: "left" }}>Student ID</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Category</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Score</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {data?.attempts?.length ? (
            data.attempts.map((a, idx) => (
              <tr key={idx}>
                <td style={{ padding: "10px", borderBottom: "1px solid #eee" }}>{a.question_id}</td>
                <td style={{ padding: "10px", borderBottom: "1px solid #eee" }}>
                  {a.correct ? "Correct" : "Incorrect"}
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #eee" }}>
                  {a.correct ? "1" : "0"}
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #eee" }}>
                  {new Date(a.time * 1000).toLocaleString()}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ textAlign: "center", padding: "1rem" }}>
                No student data found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
