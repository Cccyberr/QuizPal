// src/pages/dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { setAuthToken } from "../services/api";
import { createResult } from "../services/api";
import "../styles/theme.css";

const CATEGORIES = ["aptitude", "verbal", "technical"];
const PAGE_SIZE = 10;

export default function Dashboard() {
  const navigate = useNavigate();

  // auth / user
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  // questions (fetched list for chosen category/difficulty/page)
  const [category, setCategory] = useState("aptitude");
  const [difficulty, setDifficulty] = useState("medium");
  const [page, setPage] = useState(1);
  const [questions, setQuestions] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState(null);

  // UI: linear viewer state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  // submission state
  const [submitting, setSubmitting] = useState(false);

  // ensure axios header from localStorage
  useEffect(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (token) setAuthToken(token);
  }, []);

  // load profile once
  useEffect(() => {
    (async () => {
      setLoadingMe(true);
      try {
        const res = await api.get("/auth/me").catch(() => null);
        const user = res?.data?.user ?? null;
        setMe(user);

        if (user?.id) {
          try {
            localStorage.setItem("authId", String(user.id));
            localStorage.setItem("authEmail", user.email || "");
            localStorage.setItem("authName", user.name || "");
            localStorage.setItem("authIsAdmin", user.is_admin ? "true" : "false");
          } catch (e) {
            /* ignore storage errors */
          }
        }
      } catch (e) {
        console.warn("Failed to load profile", e);
        setMe(null);
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  // fetch questions
  const fetchQuestions = useCallback(
    async (cat = category, pg = page, diff = difficulty) => {
      setQLoading(true);
      setQError(null);
      try {
        const res = await api.get(`/questions/${cat}`, {
          params: { limit: PAGE_SIZE, page: pg, difficulty: diff },
        });
        const items = res?.data?.questions ?? [];
        const total = res?.data?.count ?? items.length;
        const normalized = items.map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : (q.options_json ? JSON.parse(q.options_json) : q.options ?? []),
        }));
        setQuestions(normalized);
        setTotalQuestions(total);
        setCurrentIndex(0);
        setAnswers(Array(normalized.length).fill(null));
      } catch (err) {
        console.error("Failed to fetch questions", err);
        setQError(err?.response?.data || err?.message || "Failed to fetch questions");
        setQuestions([]);
        setTotalQuestions(0);
        setAnswers([]);
      } finally {
        setQLoading(false);
      }
    },
    [category, page, difficulty]
  );

  useEffect(() => {
    fetchQuestions(category, page, difficulty);
  }, [category, page, difficulty, fetchQuestions]);

  // UI actions
  const changeCategory = (cat) => {
    setCategory(cat);
    setPage(1);
  };

  const goPrev = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const goNext = () => {
    if (answers[currentIndex] === null || answers[currentIndex] === undefined) {
      alert("Please select an option before proceeding.");
      return;
    }
    setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
  };

  const onSelectOption = (optIndex) => {
    setAnswers((prev) => {
      const next = prev.slice();
      next[currentIndex] = optIndex;
      return next;
    });
  };

  const handleSubmitAll = async () => {
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === null || answers[i] === undefined) {
        alert(`Please answer question ${i + 1} before submitting.`);
        setCurrentIndex(i);
        return;
      }
    }

    setSubmitting(true);
    try {
      let correctCount = 0;
      const details = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const selectedIndex = answers[i];

        let isCorrect = false;
        if (typeof q.correctIndex === "number") {
          isCorrect = q.correctIndex === selectedIndex;
        } else if (typeof q.answer === "string" && Array.isArray(q.options)) {
          const selText = (q.options[selectedIndex] ?? "").toString().trim().toLowerCase();
          isCorrect = q.answer.toString().trim().toLowerCase() === selText;
        }

        if (isCorrect) correctCount += 1;
        details.push({ questionId: q.id ?? null, selectedIndex, isCorrect });

        if (me?.id) {
          try {
            await api.post("/progress/record", {
              question_id: q.id ?? null,
              correct: !!isCorrect,
            });
          } catch (e) {
            console.warn("Failed to record progress for question", q.id, e);
          }
        }
      }

      const payload = { quizId: `quiz-${Date.now()}`, score: correctCount, total: questions.length, difficulty: difficulty || "easy" };
      let createdResult = null;
      if (me?.id) {
        try {
          const res = await createResult(payload);
          createdResult = res?.result ?? null;
        } catch (e) {
          console.warn("Failed to persist Result on server:", e);
        }
      }

      navigate("/feedback", {
        state: {
          result: createdResult || payload,
          details,
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalQuestions / PAGE_SIZE));
  const idxGlobal = (page - 1) * PAGE_SIZE + currentIndex;

  const getCategoryIcon = (cat) => {
    const icons = { aptitude: "🧮", verbal: "📝", technical: "💻" };
    return icons[cat] || "📚";
  };

  const getCategoryGradient = (cat) => {
    const gradients = {
      aptitude: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      verbal: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      technical: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
    };
    return gradients[cat] || gradients.aptitude;
  };

  const renderQuestionCard = () => {
    if (!questions || questions.length === 0) {
      return (
        <div style={{
          textAlign: "center",
          padding: "80px 40px",
          background: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)",
          borderRadius: 24,
          border: "1px solid rgba(0,0,0,0.05)"
        }}>
          <div style={{
            fontSize: 72,
            marginBottom: 24,
            filter: "grayscale(0.3)"
          }}>📚</div>
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#2d3748",
            marginBottom: 12
          }}>No questions available</div>
          <div style={{
            fontSize: 15,
            color: "#718096",
            lineHeight: 1.6
          }}>Try selecting a different category or difficulty level</div>
        </div>
      );
    }
    
    const q = questions[currentIndex];
    const opts = Array.isArray(q.options) ? q.options : [];
    const normalizedOpts = (() => {
      if (opts.length >= 4) return opts.slice(0, 4);
      const copy = opts.slice();
      while (copy.length < 4) copy.push("—");
      return copy;
    })();

    const optionLabels = ['A', 'B', 'C', 'D'];
    const optionColors = [
      { bg: "#fff5f5", border: "#fc8181", active: "#f56565" },
      { bg: "#fffaf0", border: "#f6ad55", active: "#ed8936" },
      { bg: "#f0fff4", border: "#68d391", active: "#48bb78" },
      { bg: "#ebf8ff", border: "#63b3ed", active: "#4299e1" }
    ];

    return (
      <div style={{
        padding: 0,
        borderRadius: 28,
        background: "#ffffff",
        boxShadow: "0 30px 90px rgba(0,0,0,0.12), 0 10px 30px rgba(0,0,0,0.08)",
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.06)"
      }}>
        {/* Animated Background Pattern */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 300,
          background: getCategoryGradient(category),
          opacity: 0.03,
          pointerEvents: "none"
        }} />
        
        <div style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          background: "radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />

        {/* Header Section */}
        <div style={{
          padding: "32px 36px",
          background: getCategoryGradient(category),
          position: "relative"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255, 255, 255, 0.25)",
              backdropFilter: "blur(10px)",
              padding: "10px 20px",
              borderRadius: 30,
              border: "1px solid rgba(255, 255, 255, 0.3)"
            }}>
              <span style={{ fontSize: 20 }}>{getCategoryIcon(category)}</span>
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                textTransform: "capitalize",
                letterSpacing: "0.5px"
              }}>
                {category}
              </span>
            </div>
            
            <div style={{
              background: "rgba(255, 255, 255, 0.95)",
              padding: "10px 24px",
              borderRadius: 30,
              fontSize: 14,
              fontWeight: 700,
              color: "#2d3748",
              boxShadow: "0 8px 25px rgba(0,0,0,0.15)"
            }}>
              <span style={{ opacity: 0.6 }}>Question</span> {idxGlobal + 1}/{totalQuestions}
            </div>
          </div>

          {/* Question Text */}
          <div style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(20px)",
            padding: 28,
            borderRadius: 20,
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
          }}>
            <div style={{
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.7,
              color: "#fff",
              textShadow: "0 2px 20px rgba(0,0,0,0.15)"
            }}>
              {q.qtext}
            </div>
          </div>
        </div>

        {/* Options Section */}
        <div style={{ padding: "36px" }}>
          <div style={{
            display: "grid",
            gap: 16
          }}>
            {normalizedOpts.map((opt, i) => {
              const checked = answers[currentIndex] === i;
              const colors = optionColors[i];
              
              return (
                <label key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "20px 24px",
                  borderRadius: 16,
                  background: checked ? colors.bg : "#fafafa",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  border: checked ? `2px solid ${colors.active}` : "2px solid transparent",
                  transform: checked ? "translateX(8px) scale(1.01)" : "translateX(0) scale(1)",
                  boxShadow: checked 
                    ? `0 12px 40px ${colors.active}25, 0 4px 12px ${colors.active}15`
                    : "0 2px 8px rgba(0,0,0,0.04)",
                  position: "relative",
                  overflow: "hidden"
                }}>
                  {/* Animated background on hover */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: checked ? `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg} 100%)` : "transparent",
                    opacity: 0.5,
                    transition: "opacity 0.3s ease"
                  }} />
                  
                  {/* Custom Radio Circle */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: checked ? `3px solid ${colors.active}` : "3px solid #cbd5e0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: "#fff",
                    transition: "all 0.3s ease",
                    position: "relative",
                    zIndex: 1,
                    boxShadow: checked ? `0 0 0 4px ${colors.bg}` : "none"
                  }}>
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: checked ? colors.active : "transparent",
                      transform: checked ? "scale(1)" : "scale(0)",
                      transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                    }} />
                  </div>
                  
                  <input
                    type="radio"
                    name={`q_linear_${idxGlobal}`}
                    checked={checked || false}
                    onChange={() => onSelectOption(i)}
                    style={{ display: "none" }}
                  />
                  
                  {/* Option Label Badge */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: checked 
                      ? `linear-gradient(135deg, ${colors.active} 0%, ${colors.border} 100%)`
                      : "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 16,
                    color: checked ? "#fff" : "#64748b",
                    flexShrink: 0,
                    transition: "all 0.3s ease",
                    position: "relative",
                    zIndex: 1,
                    boxShadow: checked ? `0 4px 12px ${colors.active}40` : "none"
                  }}>
                    {optionLabels[i]}
                  </div>
                  
                  {/* Option Text */}
                  <div style={{
                    fontSize: 16,
                    fontWeight: checked ? 600 : 500,
                    color: checked ? "#1a202c" : "#4a5568",
                    flex: 1,
                    lineHeight: 1.6,
                    position: "relative",
                    zIndex: 1
                  }}>
                    {opt}
                  </div>
                  
                  {/* Checkmark for selected */}
                  {checked && (
                    <div style={{
                      fontSize: 20,
                      color: colors.active,
                      position: "relative",
                      zIndex: 1,
                      animation: "checkmark 0.3s ease"
                    }}>
                      ✓
                    </div>
                  )}
                </label>
              );
            })}
          </div>

          {/* Source Info */}
          {q.source_url && q.source_url !== 'N/A' && (
            <div style={{
              marginTop: 24,
              padding: "16px 20px",
              background: "linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)",
              borderRadius: 14,
              fontSize: 13,
              color: "#718096",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              <span style={{ fontSize: 16 }}>🔗</span>
              <span><strong>Source:</strong> {q.source_url}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Animated background elements */}
      <div style={{
        position: "absolute",
        top: "10%",
        left: "5%",
        width: 400,
        height: 400,
        background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(60px)",
        animation: "float 20s ease-in-out infinite"
      }} />
      <div style={{
        position: "absolute",
        bottom: "10%",
        right: "5%",
        width: 500,
        height: 500,
        background: "radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(80px)",
        animation: "float 25s ease-in-out infinite reverse"
      }} />

      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "32px 24px",
        position: "relative",
        zIndex: 1
      }}>
        {/* Header */}
        <div style={{
          background: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(20px)",
          padding: "24px 36px",
          borderRadius: 24,
          marginBottom: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)",
          border: "1px solid rgba(255, 255, 255, 0.8)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: getCategoryGradient(category),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 900,
              color: "#fff",
              boxShadow: "0 8px 24px rgba(102, 126, 234, 0.35)",
              position: "relative"
            }}>
              Q
              <div style={{
                position: "absolute",
                inset: -4,
                borderRadius: 18,
                background: getCategoryGradient(category),
                opacity: 0.3,
                filter: "blur(8px)",
                zIndex: -1
              }} />
            </div>
            <div>
              <h1 style={{
                fontSize: 32,
                fontWeight: 900,
                background: getCategoryGradient(category),
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                margin: 0,
                letterSpacing: "-0.5px"
              }}>
                QuizPal
              </h1>
              <p style={{
                fontSize: 13,
                color: "#718096",
                margin: 0,
                fontWeight: 500
              }}>
                Master your skills, one question at a time
              </p>
            </div>
          </div>
          
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "12px 24px",
            background: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
            borderRadius: 20,
            border: "1px solid #e2e8f0",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)"
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: getCategoryGradient(category),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
            }}>
              {me?.name?.[0]?.toUpperCase() || "G"}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#2d3748" }}>
                {me ? me.name : (loadingMe ? 'Loading...' : 'Guest')}
              </div>
              <div style={{ fontSize: 12, color: "#a0aec0", fontWeight: 500 }}>
                {me?.email || 'Not logged in'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          background: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(20px)",
          padding: 40,
          borderRadius: 28,
          boxShadow: "0 30px 90px rgba(0,0,0,0.12), 0 10px 30px rgba(0,0,0,0.08)",
          border: "1px solid rgba(255, 255, 255, 0.8)"
        }}>
          {/* Category & Difficulty Section */}
          <div style={{ marginBottom: 36 }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24
            }}>
              <div>
                <h2 style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#1a202c",
                  margin: 0,
                  marginBottom: 6,
                  letterSpacing: "-0.5px"
                }}>
                  Question Bank
                </h2>
                <p style={{
                  fontSize: 14,
                  color: "#718096",
                  margin: 0,
                  fontWeight: 500
                }}>
                  Choose your category and start practicing
                </p>
              </div>
              
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 24px",
                background: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
                borderRadius: 16,
                border: "1px solid #e2e8f0"
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: getCategoryGradient(category)
                }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#4a5568" }}>
                  Difficulty:
                </span>
                <span style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#2d3748",
                  textTransform: "capitalize"
                }}>
                  {difficulty}
                </span>
              </div>
            </div>

            {/* Category Pills */}
            <div style={{ display: "flex", gap: 14 }}>
              {CATEGORIES.map((cat) => {
                const isActive = cat === category;
                return (
                  <button
                    key={cat}
                    onClick={() => changeCategory(cat)}
                    style={{
                      flex: 1,
                      padding: "18px 28px",
                      borderRadius: 16,
                      border: "none",
                      background: isActive 
                        ? getCategoryGradient(cat)
                        : "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
                      color: isActive ? "#fff" : "#4a5568",
                      fontSize: 16,
                      fontWeight: 700,
                      textTransform: "capitalize",
                      cursor: "pointer",
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: isActive 
                        ? "0 12px 40px rgba(102, 126, 234, 0.35), 0 4px 12px rgba(102, 126, 234, 0.2)"
                        : "0 2px 8px rgba(0,0,0,0.04)",
                      transform: isActive ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{getCategoryIcon(cat)}</span>
                      <span>{cat}</span>
                    </div>
                    {isActive && (
                      <div style={{
                        position: "absolute",
                        inset: -2,
                        background: getCategoryGradient(cat),
                        opacity: 0.3,
                        filter: "blur(12px)",
                        zIndex: 0
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div>
            {qLoading && (
              <div style={{
                textAlign: "center",
                padding: 80,
                background: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
                borderRadius: 24,
                border: "1px solid #e2e8f0"
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  margin: "0 auto 24px",
                  borderRadius: "50%",
                  border: "4px solid #e2e8f0",
                  borderTopColor: getCategoryGradient(category).split(",")[0].split("(")[1],
                  animation: "spin 1s linear infinite"
                }} />
                <div style={{ fontSize: 20, fontWeight: 700, color: "#2d3748", marginBottom: 8 }}>
                  Loading {category} questions...
                </div>
                <div style={{ fontSize: 14, color: "#718096", fontWeight: 500 }}>
                  Page {page} of {totalPages}
                </div>
              </div>
            )}

            {qError && (
              <div style={{
                padding: 32,
                background: "linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)",
                borderRadius: 24,
                border: "2px solid #fc8181",
                display: "flex",
                alignItems: "center",
                gap: 16
              }}>
                <div style={{ fontSize: 32 }}>⚠️</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#742a2a", marginBottom: 4 }}>
                    Error Loading Questions
                  </div>
                  <div style={{ fontSize: 14, color: "#9b2c2c", fontWeight: 500 }}>
                    {qError}
                  </div>
                </div>
              </div>
            )}

            {!qLoading && !qError && (
              <>
                {/* Progress Bar */}
                <div style={{
                  background: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
                  padding: "20px 24px",
                  borderRadius: 20,
                  marginBottom: 28,
                  border: "1px solid #e2e8f0"
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#4a5568" }}>
                      Progress
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#2d3748" }}>
                      {idxGlobal + 1} / {totalQuestions}
                    </span>
                  </div>
                  <div style={{
                    height: 12,
                    background: "#e2e8f0",
                    borderRadius: 20,
                    overflow: "hidden",
                    position: "relative"
                  }}>
                    <div style={{
                      width: `${((idxGlobal + 1) / totalQuestions) * 100}%`,
                      height: "100%",
                      background: getCategoryGradient(category),
                      borderRadius: 20,
                      transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: `0 0 20px ${getCategoryGradient(category).split(",")[0].split("(")[1]}50`,
                      position: "relative"
                    }}>
                      <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                        animation: "shimmer 2s infinite"
                      }} />
                    </div>
                  </div>
                </div>

                {/* Question Card */}
                {renderQuestionCard()}

                {/* Navigation Controls */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 32,
                  gap: 20
                }}>
                  <button
                    onClick={() => {
                      if (currentIndex > 0) goPrev();
                      else setPage((p) => Math.max(1, p - 1));
                    }}
                    disabled={page <= 1 && currentIndex <= 0}
                    style={{
                      padding: "16px 32px",
                      borderRadius: 16,
                      border: "2px solid #e2e8f0",
                      background: page <= 1 && currentIndex <= 0 ? "#f7fafc" : "#fff",
                      color: page <= 1 && currentIndex <= 0 ? "#a0aec0" : "#2d3748",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: page <= 1 && currentIndex <= 0 ? "not-allowed" : "pointer",
                      opacity: page <= 1 && currentIndex <= 0 ? 0.5 : 1,
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: page <= 1 && currentIndex <= 0 ? "none" : "0 4px 12px rgba(0,0,0,0.08)"
                    }}
                  >
                    <span style={{ fontSize: 18 }}>←</span>
                    <span>Previous</span>
                  </button>

                  <div style={{ flex: 1, textAlign: "center" }}>
                    {questions.length > 0 && (page === totalPages && currentIndex === questions.length - 1) ? (
                      <button
                        onClick={handleSubmitAll}
                        disabled={submitting}
                        style={{
                          padding: "16px 48px",
                          borderRadius: 16,
                          border: "none",
                          background: submitting 
                            ? "linear-gradient(135deg, #a0aec0 0%, #718096 100%)"
                            : "linear-gradient(135deg, #48bb78 0%, #38a169 100%)",
                          color: "#fff",
                          fontSize: 17,
                          fontWeight: 800,
                          cursor: submitting ? "not-allowed" : "pointer",
                          boxShadow: submitting 
                            ? "none" 
                            : "0 12px 40px rgba(72, 187, 120, 0.4), 0 4px 12px rgba(72, 187, 120, 0.2)",
                          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          transform: submitting ? "scale(1)" : "scale(1)",
                          position: "relative",
                          overflow: "hidden"
                        }}
                      >
                        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                          {submitting ? (
                            <>
                              <div style={{
                                width: 18,
                                height: 18,
                                border: "3px solid rgba(255,255,255,0.3)",
                                borderTopColor: "#fff",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite"
                              }} />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: 20 }}>✓</span>
                              <span>Submit All Answers</span>
                            </>
                          )}
                        </div>
                        {!submitting && (
                          <div style={{
                            position: "absolute",
                            inset: -2,
                            background: "linear-gradient(135deg, #48bb78 0%, #38a169 100%)",
                            opacity: 0.4,
                            filter: "blur(16px)",
                            zIndex: 0
                          }} />
                        )}
                      </button>
                    ) : null}
                  </div>

                  <button
                    onClick={() => {
                      if (currentIndex < questions.length - 1) {
                        goNext();
                      } else {
                        if (page < totalPages) {
                          setPage((p) => Math.min(totalPages, p + 1));
                        } else {
                          alert("You reached the last question. Click Submit to finish.");
                        }
                      }
                    }}
                    disabled={questions.length === 0}
                    style={{
                      padding: "16px 32px",
                      borderRadius: 16,
                      border: "none",
                      background: questions.length === 0 
                        ? "linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)"
                        : getCategoryGradient(category),
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: questions.length === 0 ? "not-allowed" : "pointer",
                      opacity: questions.length === 0 ? 0.5 : 1,
                      boxShadow: questions.length === 0 
                        ? "none"
                        : "0 8px 24px rgba(102, 126, 234, 0.35), 0 4px 12px rgba(102, 126, 234, 0.2)",
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>Next</span>
                      <span style={{ fontSize: 18 }}>→</span>
                    </div>
                    {questions.length > 0 && (
                      <div style={{
                        position: "absolute",
                        inset: -2,
                        background: getCategoryGradient(category),
                        opacity: 0.4,
                        filter: "blur(12px)",
                        zIndex: 0
                      }} />
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes checkmark {
          0% { transform: scale(0) rotate(45deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(45deg); opacity: 1; }
          100% { transform: scale(1) rotate(45deg); opacity: 1; }
        }
        
        button:not(:disabled):hover {
          transform: translateY(-2px);
        }
        
        button:not(:disabled):active {
          transform: translateY(0px);
        }
        
        label:hover {
          transform: translateX(4px) scale(1.005) !important;
        }
      `}</style>
    </div>
  );
}