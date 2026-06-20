// src/pages/ProgressPage.jsx
import React, { useEffect, useState } from "react";
import { me as apiMe, getUserProgress } from "../services/api";
import ProgressChart from "../components/ProgressChart"; // optional (you have this)
import ProgressCard from "../components/ProgressCard"; // if you created this file earlier
// If you don't have ProgressCard component, the code will still work — it will render the debug JSON.

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, correct: 0, breakdown: {} });
  const [attempts, setAttempts] = useState([]);
  const [results, setResults] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to get user from localStorage first (fast)
        let stored = null;
        try {
          stored = JSON.parse(localStorage.getItem("user"));
        } catch (e) {
          stored = null;
        }

        // If stored user found, use its id; otherwise call /auth/me to verify token and get user
        let userId = stored?.id;
        if (!userId) {
          // call apiMe() which uses axios and will attach token via interceptor
          const meResp = await apiMe();
          // me() returns { user: { id, name, ... } } per backend
          const meUser = meResp?.user ?? meResp;
          if (!meUser) {
            throw new Error("Could not determine logged in user.");
          }
          userId = meUser?.id;
          // store parsed user for future
          try {
            localStorage.setItem("user", JSON.stringify(meUser));
          } catch (e) { /* ignore */ }
          setUser(meUser);
        } else {
          setUser(stored);
        }

        if (!userId) {
          throw new Error("User id missing, cannot fetch progress.");
        }

        // Fetch progress using api helper
        // getUserProgress will call GET /api/progress/:userId
        const progResp = await getUserProgress(userId);

        // server returns { stats: { total, correct, breakdown }, attempts: [...], results: [...] }
        if (progResp?.stats) {
          setStats(progResp.stats);
        } else if (progResp?.total !== undefined) {
          // fallback if API returns top-level stats object directly
          setStats({
            total: progResp.total || 0,
            correct: progResp.correct || 0,
            breakdown: progResp.breakdown || {},
          });
        }

        setAttempts(progResp.attempts || []);
        setResults(progResp.results || []);
      } catch (err) {
        console.error("Progress fetch error:", err);
        setError(err?.response?.data || err.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Build simple chart data for ProgressChart (if available)
  const chartData = (results || []).map((r) => {
    const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
    const date = new Date((r.timestamp || Date.now()) * 1000).toLocaleDateString();
    return { date, scorePct: pct };
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h2 style={{ marginBottom: 12 }}>Progress</h2>

        {loading && (
          <div style={{ padding: 20, background: "#fff", borderRadius: 8 }}>Loading progress…</div>
        )}

        {!loading && error && (
          <div style={{ padding: 16, background: "#ffecec", color: "#a00", borderRadius: 8 }}>
            Error loading progress: {typeof error === "string" ? error : JSON.stringify(error)}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* If you have a ProgressCard component it will show nicely */}
            {typeof ProgressCard !== "undefined" ? (
              <ProgressCard stats={stats} username={user?.name || "User"} />
            ) : (
              // fallback: raw summary
              <div style={{ padding: 16, background: "#fff", borderRadius: 8 }}>
                <strong>Summary</strong>
                <div>Total attempts: {stats.total}</div>
                <div>Correct answers: {stats.correct}</div>
                <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(stats.breakdown, null, 2)}</pre>
              </div>
            )}

            {/* chart (optional) */}
            {chartData.length ? (
              <div style={{ marginTop: 20, background: "#fff", padding: 16, borderRadius: 8 }}>
                <h3 style={{ marginTop: 0 }}>Score over time</h3>
                <ProgressChart data={chartData} />
              </div>
            ) : (
              <div style={{ marginTop: 20, padding: 16, background: "#fff", borderRadius: 8 }}>
                <h3 style={{ marginTop: 0 }}>Recent Attempts</h3>
                {attempts.length === 0 ? (
                  <div style={{ color: "#888" }}>No attempts found.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Question</th>
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Correct</th>
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((a) => (
                        <tr key={a.id || `${a.question_id}-${a.time}`}>
                          <td style={{ padding: 8, borderBottom: "1px solid #fafafa" }}>{a.question_id ?? "—"}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #fafafa" }}>{a.correct ? "Yes" : "No"}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #fafafa" }}>{new Date((a.time || Date.now()) * 1000).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
