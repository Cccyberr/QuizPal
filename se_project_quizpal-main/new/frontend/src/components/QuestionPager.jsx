// src/components/QuestionPager.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

/**
 * QuestionPager (simple, non-clashing)
 * - strips simple leading labels from options ("1.", "A)", "Q1:")
 * - removes options that exactly match the question text (after trim)
 * - dedupes, trims/pads to 4 visible options
 * - shows question text as plain text (no radio next to it)
 */

function stripLeadingLabel(s = "") {
  // remove leading "1.", "1.5.", "A)", "A.", "Q1:", "1 -", "1)"
  return s.replace(/^[\s]*([A-Za-z]\.|[A-Za-z]\)|\d+(\.\d+)*[\.\)\-:]|\d+\s*[:\.\)])\s*/i, "").trim();
}

export default function QuestionPager({
  category = "technical",
  limit = 10,
  onFinish = null,
  includeExplanations = false
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await axios.get(`/api/questions/${category}?limit=${limit}`);
        if (!cancelled) {
          const qs = (res.data.questions || []).slice(0, limit);
          setQuestions(qs);
        }
      } catch (err) {
        console.error("Failed to load questions:", err);
        setQuestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => (cancelled = true);
  }, [category, limit]);

  if (loading) return <div className="p-6 text-center">Loading questions...</div>;
  if (!questions.length) return <div className="p-6 text-center">No questions available.</div>;

  const q = questions[index];
  const qId = q.id ?? index;

  // build safe options: strip labels, remove exact qtext duplicates, dedupe, trim/pad to 4
  const buildOptions = (rawOpts = []) => {
    const qtext = (q.qtext || "").toString().trim();

    // normalize raw to trimmed strings
    const raw = (rawOpts || []).map(o => (o === null || o === undefined) ? "" : o.toString().trim()).filter(Boolean);

    // strip labels and filter out any option that exactly matches question text
    const cleaned = raw.map(opt => stripLeadingLabel(opt)).filter(opt => {
      if (!opt) return false;
      // remove option equal to question text (exact match)
      if (opt.trim() === qtext.trim()) return false;
      return true;
    });

    // dedupe while preserving order
    const uniq = [];
    const seen = new Set();
    for (const c of cleaned) {
      if (!seen.has(c)) {
        seen.add(c);
        uniq.push(c);
      }
    }

    // fallback: if too few options after cleaning, use raw deduped options (but still strip labels)
    let final = uniq;
    if (final.length < 2) {
      final = Array.from(new Set(raw.map(opt => stripLeadingLabel(opt)).filter(Boolean)));
      // still remove exact qtext if present
      final = final.filter(opt => opt.trim() !== qtext.trim());
    }

    // ensure exactly 4 visible options: slice/pad
    final = final.slice(0, 4);
    while (final.length < 4) final.push("Option not available");

    return final;
  };

  const opts = buildOptions(q.options);

  const selected = answers[qId] ?? null;

  const handleSelect = (val) => setAnswers((p) => ({ ...p, [qId]: val }));

  const goNext = () => setIndex((i) => Math.min(questions.length - 1, i + 1));
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));

  const computeResults = () => {
    let total = 0;
    const details = [];
    for (const ques of questions) {
      const idk = ques.id ?? questions.indexOf(ques);
      const sel = answers[idk] ?? null;
      const expected = (ques.answer ?? "").toString().trim().toLowerCase();
      const actual = (sel ?? "").toString().trim().toLowerCase();
      const correct = !!(expected && expected === actual);
      if (correct) total++;
      details.push({
        id: idk,
        qtext: ques.qtext,
        options: ques.options || [],
        selected: sel,
        correct,
        explanation: includeExplanations ? (ques.explanation ?? null) : (ques.explanation ?? null)
      });
    }
    return { total, details };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { total, details } = computeResults();
    setScore(total);
    if (typeof onFinish === "function") {
      try {
        onFinish(answers, total, questions, details);
      } catch (err) {
        console.warn("onFinish threw", err);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Question Bank</h2>
          <div className="text-sm text-gray-500">
            Category: <span className="capitalize font-medium">{category}</span> • {questions.length} questions
          </div>
        </div>
        <div className="text-sm">
          {index + 1} / {questions.length}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6 p-4 border rounded">
          {/* QUESTION TEXT (plain text only) */}
          <div className="mb-3">
            <span className="font-bold mr-2">{index + 1}.</span>
            <span>{q.qtext}</span>
          </div>

          {/* EXACTLY 4 OPTIONS */}
          <div className="space-y-3 mt-4">
            {opts.map((opt, i) => (
              <label
                key={i}
                className={
                  "flex items-center gap-3 p-3 rounded cursor-pointer " +
                  (selected === opt ? "bg-teal-50 border border-teal-200" : "hover:bg-gray-50")
                }
              >
                <input
                  type="radio"
                  name={`q_${qId}`}
                  value={opt}
                  checked={selected === opt}
                  onChange={() => handleSelect(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          {q.source_url && <div className="text-xs text-gray-400 mt-3">Source: {q.source_url}</div>}
        </div>

        <div className="flex justify-between items-center">
          <div>
            <button
              type="button"
              onClick={goPrev}
              disabled={index === 0}
              className={`px-4 py-2 rounded ${index === 0 ? "bg-gray-200 text-gray-500" : "bg-white border"}`}
            >
              Previous
            </button>
          </div>

          <div>
            {index < questions.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!selected}
                className={`px-5 py-2 rounded text-white ${selected ? "bg-teal-600 hover:bg-teal-700" : "bg-gray-300 text-gray-600"}`}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={!selected}
                className={`px-5 py-2 rounded text-white ${selected ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 text-gray-600"}`}
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </form>

      {score !== null && (
        <div className="mt-4 text-center text-lg font-medium text-indigo-700">
          You scored {score} / {questions.length}
        </div>
      )}
    </div>
  );
}
