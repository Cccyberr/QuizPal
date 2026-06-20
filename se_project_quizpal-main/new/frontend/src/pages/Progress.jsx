// src/pages/ProgressPage.jsx
import React, { useEffect, useState } from "react";
import { me as apiMe, getUserProgressSql } from "../services/api";

// Try to import ProgressCard; if file missing this import will still fail at build time.
// We assume you created src/components/ProgressCard.jsx as instructed earlier.
import ProgressCard from "../components/ProgressCard.jsx";

// Lightweight fallback component (rendered only if ProgressCard is undefined at runtime)
function SimpleProgressCard({ stats = {}, username = "User" }) {
  const total = Number(stats.total || 0);
  const correct = Number(stats.correct || 0);
  const pct = total ? Math.round((correct / total) * 100) : 0;
  return (
    <div style={{ padding:20, borderRadius:8, background:"#f3f4f6", color:"#111" }}>
      <div style={{ fontWeight:700 }}>Welcome back, {username}</div>
      <div style={{ marginTop:8 }}>Total Attempts: <strong>{total}</strong></div>
      <div>Correct Answers: <strong>{correct}</strong></div>
      <div>Accuracy: <strong>{pct}%</strong></div>
    </div>
  );
}

export default function ProgressPage() {
  const [stats, setStats] = useState({ total: 0, correct: 0, breakdown: {} });
  const [username, setUsername] = useState("User");
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const meResp = await apiMe();
        const user = meResp?.user || meResp;
        if (!user || !user.id) {
          setLoading(false);
          return;
        }
        if (!mounted) return;
        setUsername(user.name || "User");

        const resp = await getUserProgressSql(user.id);
        const s = resp?.stats || { total: 0, correct: 0, breakdown: {} };
        if (!mounted) return;
        setStats({ total: Number(s.total||0), correct: Number(s.correct||0), breakdown: s.breakdown || {} });
        setAttempts(resp?.attempts || []);
      } catch (err) {
        console.error("Failed to load progress (SQL):", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading progress…</div>;

  // Use ProgressCard if available, otherwise fallback to SimpleProgressCard
  const Card = typeof ProgressCard !== "undefined" ? ProgressCard : SimpleProgressCard;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Card stats={stats} username={username} />
        <div style={{ marginTop: 20 }}>
          <h3>Recent Attempts</h3>
          {attempts.length === 0 ? (
            <div style={{ color: "#6b7280" }}>No attempts found.</div>
          ) : (
            <div style={{ overflowX: "auto", background: "#fff", borderRadius: 8, padding: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "8px 6px" }}>ID</th>
                    <th style={{ padding: "8px 6px" }}>Question</th>
                    <th style={{ padding: "8px 6px" }}>Correct</th>
                    <th style={{ padding: "8px 6px" }}>Time (unix)</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map(a => (
                    <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 6px" }}>{a.id}</td>
                      <td style={{ padding: "8px 6px" }}>{a.question_id}</td>
                      <td style={{ padding: "8px 6px" }}>{a.correct ? "Yes" : "No"}</td>
                      <td style={{ padding: "8px 6px" }}>{a.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
