// src/pages/Quiz.jsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './Quiz.css'; // 👈 Add this line for styles

export default function Quiz({ source = 'aptitude' }) {
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/questions/${source}`);
        setQuestions(res.data.questions);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [source]);

  const handleSubmit = () => {
    if (!questions[idx]) return;
    const q = questions[idx];
    const correct = selected === q.answer;
    if (correct) setScore(score + 1);
    setSelected(null);
    if (idx < questions.length - 1) setIdx(idx + 1);
    else setSubmitted(true);
  };

  if (!questions.length) return <div className="loading">Loading questions...</div>;

  if (submitted) {
    return (
      <div className="quiz-container">
        <div className="quiz-card result-card">
          <h2 className="result-title">Quiz Complete 🎉</h2>
          <p className="result-text">Your score: <b>{score}</b> / {questions.length}</p>
          <button className="restart-btn" onClick={() => { setIdx(0); setScore(0); setSubmitted(false); }}>
            Restart Quiz
          </button>
        </div>
      </div>
    );
  }

  const q = questions[idx];

  return (
    <div className="quiz-container">
      <div className="quiz-card">
        <h2 className="quiz-title">Quiz on {source.charAt(0).toUpperCase() + source.slice(1)}</h2>
        <div className="question-box">
          <p className="question-text">
            <b>Q{idx + 1}.</b> {q.qtext}
          </p>
        </div>

        <div className="options-grid">
          {q.options.map((opt, i) => (
            <label
              key={i}
              className={`option ${selected === opt ? 'selected' : ''}`}
              onClick={() => setSelected(opt)}
            >
              <input
                type="radio"
                name="opt"
                checked={selected === opt}
                readOnly
              />
              <span dangerouslySetInnerHTML={{ __html: opt }} />
            </label>
          ))}
        </div>

        <button className="submit-btn" onClick={handleSubmit}>
          {idx < questions.length - 1 ? 'Next ➜' : 'Finish ✅'}
        </button>

        <p className="progress">
          Question {idx + 1} of {questions.length}
        </p>
      </div>
    </div>
  );
}
