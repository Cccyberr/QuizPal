// src/pages/Feedback.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Feedback() {
  const loc = useLocation();
  const nav = useNavigate();
  const result = loc.state?.result || null;

  const [showConfetti, setShowConfetti] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from backend (uses existing /api/auth/me)
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token =
          localStorage.getItem("token") || localStorage.getItem("authToken");
        if (!token) {
          nav("/login", { replace: true });
          return;
        }

        const response = await fetch("http://localhost:5000/api/auth/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          // handle unauthorized explicitly
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            localStorage.removeItem("authToken");
            nav("/login", { replace: true });
            return;
          }
          console.error("Failed to fetch user data:", response.status, response.statusText);
          setUserData(null);
          return;
        }

        const data = await response.json();
        // endpoint returns { user: { ... } }
        if (data?.user) {
          setUserData(data.user);
        } else {
          // fallback if backend returns plain user
          setUserData(data);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [nav]);

  // Initialize confetti effect
  useEffect(() => {
    if (!result) {
      nav("/dashboard", { replace: true });
      return;
    }

    if (result.score / result.total >= 0.8) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [result, nav]);

  if (!result || loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "white", fontSize: 24 }}>Loading...</div>
      </div>
    );
  }

  const score = result.score ?? 0;
  const total = result.total ?? 0;
  const pct = total ? Math.round((score / total) * 100) : 0;
  const performance = getPerformanceData(pct);

  // Prepare certificate data
  const certificateData = {
    id: result.id || `CERT-${Date.now()}`,
    score: score,
    total: total,
    difficulty: result.difficulty || "Medium",
    userName: userData?.name || userData?.username || "Student",
    quizTitle: result.quizTitle || result.category || "Quiz",
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };

  function handlePrint() {
    setShowCertificate(true);
    setTimeout(() => {
      window.print();
    }, 100);
  }

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #certificate-print, #certificate-print * {
            visibility: visible;
          }
          #certificate-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.3); }
          50% { box-shadow: 0 0 40px rgba(255,255,255,0.6); }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "60px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated Background Elements */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "5%",
            width: 300,
            height: 300,
            background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
            borderRadius: "50%",
            animation: "float 6s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            right: "10%",
            width: 200,
            height: 200,
            background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
            borderRadius: "50%",
            animation: "float 8s ease-in-out infinite",
          }}
        />

        {showConfetti && <Confetti />}

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Header Section with User Name */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 40,
              animation: "glow 3s ease-in-out infinite",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                padding: "20px 40px",
                borderRadius: 50,
                border: "2px solid rgba(255,255,255,0.3)",
                marginBottom: 20,
              }}
            >
              <h1
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: "white",
                  margin: 0,
                  textShadow: "0 4px 20px rgba(0,0,0,0.3)",
                  letterSpacing: "2px",
                }}
              >
                {userData?.name || userData?.username}'s Results
              </h1>
            </div>
          </div>

          <ResultCard performance={performance} score={score} total={total} pct={pct} difficulty={result.difficulty} />

          <ActionButtons handlePrint={handlePrint} nav={nav} />

          {/* Motivational Quote */}
          <div
            style={{
              marginTop: 40,
              padding: 30,
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.2)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: "white",
                fontSize: 20,
                fontStyle: "italic",
                margin: 0,
                textShadow: "0 2px 10px rgba(0,0,0,0.2)",
              }}
            >
              {pct >= 80 ? "✨ Success is the sum of small efforts repeated every day. ✨" : "💪 Every expert was once a beginner. Keep learning! 💪"}
            </p>
          </div>

          {/* Achievement Badges */}
          {pct >= 80 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 20,
                marginTop: 30,
                flexWrap: "wrap",
              }}
            >
              {[
                { icon: "🎯", label: "High Scorer" },
                { icon: "⭐", label: "Excellence" },
                { icon: "🚀", label: "Top Performer" },
              ].map((badge, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(10px)",
                    padding: "15px 25px",
                    borderRadius: 15,
                    border: "1px solid rgba(255,255,255,0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{badge.icon}</span>
                  <span style={{ color: "white", fontWeight: 600 }}>{badge.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCertificate && (
        <Certificate result={certificateData} performance={performance} pct={pct} onClose={() => setShowCertificate(false)} />
      )}
    </>
  );
}

// Certificate Component
function Certificate({ result, performance, pct, onClose }) {
  return (
    <div
      id="certificate-print"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100vh",
        background: "rgba(0,0,0,0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "210mm",
          height: "297mm",
          background: "white",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Border */}
        <div
          style={{
            position: "absolute",
            inset: "30px",
            border: "3px solid #667eea",
            borderRadius: "8px",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "40px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
          }}
        />

        {/* Corner Decorations */}
        {["top-left", "top-right", "bottom-left", "bottom-right"].map((pos) => (
          <div
            key={pos}
            style={{
              position: "absolute",
              width: 80,
              height: 80,
              [pos.includes("top") ? "top" : "bottom"]: 20,
              [pos.includes("left") ? "left" : "right"]: 20,
              background: `linear-gradient(135deg, ${performance.color}22, ${performance.color}11)`,
              borderRadius: "50%",
            }}
          />
        ))}

        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "80px 100px",
            textAlign: "center",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header */}
          <div>
            <div style={{ fontSize: 60, marginBottom: 10 }}>🏆</div>
            <h1
              style={{
                fontSize: 56,
                fontWeight: 900,
                background: performance.gradient,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                margin: "0 0 10px 0",
                letterSpacing: "2px",
              }}
            >
              CERTIFICATE
            </h1>
            <p
              style={{
                fontSize: 24,
                color: "#6b7280",
                margin: 0,
                letterSpacing: "4px",
                fontWeight: 300,
              }}
            >
              OF ACHIEVEMENT
            </p>
          </div>

          {/* Main Content */}
          <div style={{ margin: "40px 0" }}>
            <p
              style={{
                fontSize: 18,
                color: "#6b7280",
                margin: "0 0 20px 0",
              }}
            >
              This certifies that
            </p>
            <h2
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: "#1f2937",
                margin: "0 0 30px 0",
                borderBottom: "2px solid #e5e7eb",
                paddingBottom: 10,
                fontFamily: "serif",
              }}
            >
              {result.userName}
            </h2>
            <p
              style={{
                fontSize: 18,
                color: "#6b7280",
                margin: "0 0 15px 0",
                lineHeight: 1.8,
              }}
            >
              has successfully completed
            </p>
            <h3
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "#374151",
                margin: "0 0 40px 0",
              }}
            >
              {result.quizTitle}
            </h3>

            {/* Score Badge */}
            <div
              style={{
                display: "inline-block",
                padding: "20px 40px",
                background: performance.gradient,
                borderRadius: "50px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              }}
            >
              <div style={{ fontSize: 48, fontWeight: 900, color: "white" }}>
                {result.score}/{result.total}
              </div>
              <div style={{ fontSize: 16, color: "white", opacity: 0.9 }}>
                {pct}% - Grade: {performance.grade}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginTop: 40,
                paddingTop: 30,
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    width: 200,
                    height: 2,
                    background: "#d1d5db",
                    marginBottom: 8,
                  }}
                />
                <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Instructor Signature</p>
              </div>

              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 14, color: "#9ca3af", fontWeight: 600 }}>{result.date}</p>
                <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#d1d5db" }}>Certificate ID: {result.id}</p>
              </div>

              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    width: 200,
                    height: 2,
                    background: "#d1d5db",
                    marginBottom: 8,
                  }}
                />
                <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Date of Completion</p>
              </div>
            </div>
          </div>
        </div>

        {/* Watermark */}
        <div
          style={{
            position: "absolute",
            bottom: 100,
            right: 100,
            fontSize: 120,
            opacity: 0.03,
            transform: "rotate(-15deg)",
            pointerEvents: "none",
          }}
        >
          {performance.emoji}
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const confettiElements = useMemo(
    () =>
      [...Array(50)].map((_, i) => ({
        left: Math.random() * 100,
        duration: 2 + Math.random() * 3,
        delay: Math.random() * 2,
        color: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"][i % 6],
        rotation: Math.random() * 360,
      })),
    []
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 999,
      }}
    >
      {confettiElements.map((conf, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "-10px",
            left: `${conf.left}%`,
            width: 12,
            height: 12,
            background: conf.color,
            borderRadius: "50%",
            animation: `fall ${conf.duration}s linear ${conf.delay}s`,
            transform: `rotate(${conf.rotation}deg)`,
          }}
        />
      ))}

      <style>{`
        @keyframes fall {
          0% { top:-10px; opacity:1; }
          100% { top:100vh; opacity:0; }
        }
      `}</style>
    </div>
  );
}

function ResultCard({ performance, score, total, pct, difficulty }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(20px)",
        padding: 50,
        borderRadius: 30,
        marginBottom: 40,
        boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.3)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative gradient overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: performance.gradient,
        }}
      />

      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 90, animation: "float 3s ease-in-out infinite", display: "inline-block" }}>{performance.emoji}</div>

        <h1
          style={{
            fontSize: 48,
            fontWeight: 900,
            background: performance.gradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: "20px 0 10px 0",
            letterSpacing: "1px",
          }}
        >
          {performance.message}
        </h1>

        <p style={{ fontSize: 20, color: "#6b7280", margin: 0, fontWeight: 500 }}>{performance.improvement}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 25 }}>
        <SimpleCard label="Score" value={`${score}/${total}`} gradient={performance.gradient} color="#fff" icon="📊" />
        <SimpleCard label="Accuracy" value={`${pct}%`} color={performance.color} icon="🎯" />
        <SimpleCard label="Grade" value={performance.grade} color={performance.color} icon="⭐" />
        <SimpleCard label="Difficulty" value={difficulty || "Medium"} icon="🔥" />
      </div>
    </div>
  );
}

function SimpleCard({ label, value, color, gradient, icon }) {
  return (
    <div
      style={{
        padding: 30,
        borderRadius: 24,
        background: gradient || "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
        textAlign: "center",
        border: gradient ? "none" : "2px solid #e5e7eb",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.3s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-5px) scale(1.02)";
        e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <h4 style={{ margin: 0, fontSize: 14, color: gradient ? "#fff" : "#6b7280", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>{label}</h4>
      <div style={{ fontSize: 42, fontWeight: 900, color: color || "#1f2937", marginTop: 12 }}>{value}</div>
    </div>
  );
}

function ActionButtons({ handlePrint, nav }) {
  const buttonBaseStyle = {
    padding: "20px 32px",
    borderRadius: 16,
    border: "none",
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
      <button
        onClick={handlePrint}
        style={{ ...buttonBaseStyle, background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 30px rgba(102,126,234,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
        }}
      >
        🖨️ Print Certificate
      </button>

      <button
        onClick={() => nav("/quiz")}
        style={{ ...buttonBaseStyle, background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 30px rgba(102,126,234,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
        }}
      >
        🔄 Try Again
      </button>

      <button
        onClick={() => nav("/dashboard")}
        style={{ ...buttonBaseStyle, background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 30px rgba(102,126,234,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
        }}
      >
        🏠 Dashboard
      </button>
    </div>
  );
}

function getPerformanceData(pct) {
  if (pct >= 90)
    return {
      grade: "A+",
      emoji: "🏆",
      message: "Outstanding Performance!",
      color: "#10b981",
      gradient: "linear-gradient(135deg, #10b981, #059669)",
      improvement: "Keep challenging yourself!",
    };
  if (pct >= 80)
    return {
      grade: "A",
      emoji: "🎉",
      message: "Excellent Work!",
      color: "#3b82f6",
      gradient: "linear-gradient(135deg, #3b82f6, #2563eb)",
      improvement: "Review a little for perfection.",
    };
  if (pct >= 70)
    return {
      grade: "B",
      emoji: "👍",
      message: "Good Effort!",
      color: "#f59e0b",
      gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
      improvement: "Focus on weak areas.",
    };
  if (pct >= 60)
    return {
      grade: "C",
      emoji: "📚",
      message: "Keep Practicing",
      color: "#ef4444",
      gradient: "linear-gradient(135deg, #ef4444, #dc2626)",
      improvement: "Revise concepts again.",
    };
  return {
    grade: "D",
    emoji: "💪",
    message: "Don't Give Up!",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
    improvement: "Study fundamentals.",
  };
}
