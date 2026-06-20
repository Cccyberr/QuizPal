import React from "react";

export default function DifficultyBanner({ difficulty = "easy", small = false }) {
  const map = {
    easy: { label: "EASY", color: "#c0f5c2", emoji: "🌿" },
    medium: { label: "MEDIUM", color: "#ffd580", emoji: "🔥" },
    hard: { label: "HARD", color: "#ff9b9b", emoji: "⛰️" },
  };
  const info = map[difficulty] || map["easy"];
  const style = {
    backgroundColor: info.color,
    padding: small ? "4px 10px" : "6px 14px",
    borderRadius: "20px",
    display: "inline-block",
    fontWeight: "bold",
    color: "#222",
  };

  return (
    <div style={style} role="status" aria-live="polite">
      <span aria-hidden>{info.emoji}</span> {info.label}
    </div>
  );
}
