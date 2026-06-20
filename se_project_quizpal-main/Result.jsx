import React from "react";

export default function ResultPage({ result, onBack }) {
  if (!result) return <div className="card">No result available.</div>;

  return (
    <div className="card">
      <h2>Quiz Results</h2>
      <div>Score: {result.score}/{result.total}</div>
      <div style={{ marginTop: 8 }}>Feedback: {result.feedback?.summary}</div>

      <div style={{ marginTop: 12 }}>
        <h4>Tips</h4>
        <ul>
          {result.feedback?.tips?.length ? (
            result.feedback.tips.map((t, i) => (
              <li key={i}>
                <strong>{t.topic}</strong>: {t.advice}
              </li>
            ))
          ) : (
            <li>No specific tips provided.</li>
          )}
        </ul>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={onBack}>Back to Quiz</button>
      </div>
    </div>
  );
}
