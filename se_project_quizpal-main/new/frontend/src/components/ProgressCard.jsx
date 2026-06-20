import React, { useMemo } from "react";
import PropTypes from "prop-types";

export default function ProgressCard({ stats = { total: 0, correct: 0, breakdown: {} }, username = "User" }) {

  const total = Number(stats.total) || 0;
  const correct = Number(stats.correct) || 0;
  const breakdown = stats.breakdown || {};

  const accuracy = useMemo(() => {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }, [total, correct]);

  const getAccuracyColor = (acc) => {
    if (acc >= 85) return "#10b981";
    if (acc >= 70) return "#f59e0b";
    return "#ef4444";
  };

  const getProgressColor = (pct) => {
    if (pct >= 85) return "linear-gradient(135deg, #10b981, #059669)";
    if (pct >= 70) return "linear-gradient(135deg, #f59e0b, #d97706)";
    return "linear-gradient(135deg, #ef4444, #dc2626)";
  };

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 16,
        background: "linear-gradient(135deg, #667eea, #764ba2)",
        marginTop: 20,
        color: "#fff"
      }}
    >
      <h2>Welcome back, {username}</h2>

      <div style={{ marginTop: 12 }}>
        <h3>Accuracy: <span style={{ color: getAccuracyColor(accuracy) }}>{accuracy}%</span></h3>
      </div>

      <div style={{ marginTop: 20 }}>
        <p>Total Attempts: {total}</p>
        <p>Correct Answers: {correct}</p>
      </div>

      <div style={{ marginTop: 24, background: "#fff", color: "#000", padding: 16, borderRadius: 12 }}>
        <h3>Progress by Topic</h3>

        {Object.keys(breakdown).length === 0 && (
          <div style={{ fontStyle: "italic", color: "#777", marginTop: 12 }}>
            No topic data available yet.
          </div>
        )}

        {Object.keys(breakdown).map((topic) => {
          const t = breakdown[topic].total || 0;
          const c = breakdown[topic].correct || 0;
          const pct = t ? Math.round((c / t) * 100) : 0;

          return (
            <div key={topic} style={{ marginTop: 16 }}>
              <strong>{topic}</strong> — {pct}% ({c}/{t})
              <div style={{ height: 10, background: "#ddd", borderRadius: 6, marginTop: 6 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    borderRadius: 6,
                    background: getProgressColor(pct)
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

ProgressCard.propTypes = {
  username: PropTypes.string,
  stats: PropTypes.object
};
