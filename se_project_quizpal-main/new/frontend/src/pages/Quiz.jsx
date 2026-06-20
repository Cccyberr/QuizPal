// src/pages/Quiz.jsx
import React, { useEffect, useState } from "react";
import { fetchQuestions, createResult } from "../services/api";
import { useNavigate } from "react-router-dom";
import { recordAttempt } from "../services/api"; // ensure at top

export default function Quiz(){
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(()=> {
    (async ()=> {
      try {
        const res = await fetchQuestions("aptitude", { limit: 10 });
        setQuestions(res.questions || []);
      } catch(e) {
        console.error(e);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div style={{ padding:24 }}>Loading questions…</div>;
  if (!questions.length) return <div style={{ padding:24 }}>No questions available.</div>;

  const q = questions[index];
  

  async function select(i) {
    console.log("DEBUG select - idx:", index, "option:", i);
    setAnswers(prev => ({ ...prev, [index]: i }));

    const q = questions[index];
    const selectedOption = q.options?.[i];
    const isCorrect = selectedOption === q.answer;
    console.log("DEBUG isCorrect:", isCorrect, "q.id:", q.id);

    try {
      const res = await recordAttempt({ question_id: q.id, correct: isCorrect });
      console.log("DEBUG recordAttempt response:", res);
    } catch (err) {
      console.error("DEBUG recordAttempt failed:", err);
    }

    if (index < questions.length - 1) setIndex(index + 1);
  }




  async function handleFinish(){
    // compute score
    let correct = 0;
    for (let i=0;i<questions.length;i++){
      const sel = answers[i];
      if (sel === undefined) continue;
      const opt = questions[i].options || [];
      if (opt[sel] === questions[i].answer) correct++;
    }
    const payload = { quizId: `quiz-${Date.now()}`, score: correct, total: questions.length, difficulty: "easy" };
    try {
      const res = await createResult(payload);
      const created = res.result || payload;
      navigate("/feedback", { state: { result: created } });
    } catch (e) {
      console.error(e);
      navigate("/feedback", { state: { result: payload } });
    }
  }

  return (
    <div style={{ padding:24 }}>
      <div style={{ maxWidth:800, margin:"24px auto" }}>
        <h2>Quiz</h2>
        <div style={{ border:"1px solid #eee", padding:16, borderRadius:8 }}>
          <div style={{ fontWeight:700 }}>{index+1}. {q.qtext}</div>
          <div style={{ marginTop:12 }}>
            {(q.options||[]).map((opt, i)=>(
              <div key={i} style={{ marginBottom:8 }}>
                <button onClick={()=>select(i)} style={{ padding:8 }}>{opt}</button>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12 }}>
            <button onClick={() => setIndex(Math.max(0,index-1))} className="btn">Previous</button>
            {index === questions.length-1 ? (
              <button onClick={handleFinish} className="btn btn-primary" style={{ marginLeft:8 }}>Submit Quiz</button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
