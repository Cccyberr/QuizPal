import React, { useState, useEffect } from "react";
import axios from "axios";

export default function QuestionBank({ category = "technical", onSubmit }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(null);

  // ✅ Fetch questions from backend
  useEffect(() => {
    async function fetchQuestions() {
      try {
        setLoading(true);
        const res = await axios.get(`/api/questions/${category}?limit=10`);
        setQuestions(res.data.questions || []);
      } catch (err) {
        console.error("Failed to load questions:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, [category]);

  // ✅ Record selected option
  const handleSelect = (qid, option) => {
    setAnswers({ ...answers, [qid]: option });
  };

  // ✅ Submit all answers together
  const handleSubmit = (e) => {
    e.preventDefault();
    let total = 0;
    questions.forEach((q) => {
      if (answers[q.id] && answers[q.id] === q.answer) total++;
    });
    setScore(total);
    if (onSubmit) onSubmit(total, questions.length);
  };

  if (loading)
    return <div className="p-8 text-center text-gray-600">Loading questions...</div>;
  if (!questions.length)
    return <div className="p-8 text-center text-gray-600">No questions available.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-2xl mt-8">
      <h2 className="text-2xl font-bold mb-4">Question Bank</h2>
      <p className="text-gray-500 mb-6">
        {questions.length} questions available — category:{" "}
        <span className="font-semibold capitalize">{category}</span>
      </p>

      <form onSubmit={handleSubmit}>
        {questions.map((q, index) => (
          <div key={q.id} className="mb-8 border-b pb-6">
            <h3 className="text-lg font-semibold mb-2">
              {index + 1}. {q.qtext}
            </h3>
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <label
                  key={i}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded p-1"
                >
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => handleSelect(q.id, opt)}
                    className="text-blue-500 focus:ring-blue-400"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* ✅ Single Submit Button at the end */}
        <div className="flex justify-center">
          <button
            type="submit"
            className="px-6 py-2 mt-4 text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition"
          >
            Submit
          </button>
        </div>

        {/* ✅ Show score after submission */}
        {score !== null && (
          <p className="mt-6 text-center text-lg font-medium text-green-600">
            You scored {score} / {questions.length}
          </p>
        )}
      </form>
    </div>
  );
}
