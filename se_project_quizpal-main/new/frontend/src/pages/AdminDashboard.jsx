// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { getAllProgress, getUserProgress } from "../services/api";

/**
 * Admin Dashboard — Monitor all users' progress.
 * - replaces certificate-approval list
 * - shows aggregated progress (total / correct / accuracy / streak)
 * - lets admin view a user's detailed progress (attempts + results) in a modal
 */

function formatTimestamp(ts) {
  if (ts == null) return "—";
  const n = Number(ts);
  if (Number.isNaN(n)) return String(ts);
  // heuristic: seconds vs ms
  const ms = n < 1e12 ? n * 1000 : n;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
}

function UserDetailModal({ open, onClose, userId, data, loading, error }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.75)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
      animation: "fadeIn 0.2s ease-out"
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div style={{
        width: "90%",
        maxWidth: 920,
        background: "linear-gradient(to bottom, #ffffff, #fafafa)",
        borderRadius: 20,
        padding: 32,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        maxHeight: "85vh",
        overflowY: "auto",
        animation: "slideUp 0.3s ease-out"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: "2px solid #e2e8f0"
        }}>
          <div>
            <h3 style={{ 
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              User Progress
            </h3>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>{userId}</div>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              padding: "10px 20px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              boxShadow: "0 4px 12px rgba(244, 63, 94, 0.3)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(244, 63, 94, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 12px rgba(244, 63, 94, 0.3)";
            }}
          >
            Close
          </button>
        </div>

        {loading ? (
          <div style={{ 
            padding: 60,
            textAlign: "center",
            color: "#94a3b8"
          }}>
            <div style={{
              width: 50,
              height: 50,
              border: "4px solid #e2e8f0",
              borderTop: "4px solid #667eea",
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 1s linear infinite"
            }}></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading user progress…
          </div>
        ) : error ? (
          <div style={{ 
            padding: 20,
            color: "#991b1b",
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            borderRadius: 16,
            border: "1px solid #fca5a5",
            boxShadow: "0 4px 12px rgba(220, 38, 38, 0.1)"
          }}>
            {String(error)}
          </div>
        ) : !data ? (
          <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
            No details available.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{ 
                padding: 20,
                borderRadius: 16,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                minWidth: 160,
                boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
                color: "#fff"
              }}>
                <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 600, marginBottom: 8 }}>Total Attempts</div>
                <div style={{ fontWeight: 800, fontSize: 32 }}>{data.stats?.total ?? 0}</div>
              </div>
              <div style={{ 
                padding: 20,
                borderRadius: 16,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                minWidth: 160,
                boxShadow: "0 8px 24px rgba(16, 185, 129, 0.3)",
                color: "#fff"
              }}>
                <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 600, marginBottom: 8 }}>Correct</div>
                <div style={{ fontWeight: 800, fontSize: 32 }}>{data.stats?.correct ?? 0}</div>
              </div>
              <div style={{ 
                padding: 20,
                borderRadius: 16,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                minWidth: 180,
                boxShadow: "0 8px 24px rgba(245, 158, 11, 0.3)",
                color: "#fff"
              }}>
                <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 600, marginBottom: 8 }}>Accuracy</div>
                <div style={{ fontWeight: 800, fontSize: 32 }}>
                  {(() => {
                    const tot = Number(data.stats?.total || 0);
                    const cor = Number(data.stats?.correct || 0);
                    return tot ? Math.round((cor / tot) * 100) + "%" : "0%";
                  })()}
                </div>
              </div>
            </div>

            <section style={{ marginBottom: 28 }}>
              <h4 style={{ 
                marginBottom: 16,
                fontSize: 20,
                fontWeight: 700,
                color: "#1e293b"
              }}>
                Recent Attempts
              </h4>
              {(!data.attempts || data.attempts.length === 0) ? (
                <div style={{ 
                  color: "#94a3b8",
                  fontStyle: "italic",
                  padding: 32,
                  textAlign: "center",
                  background: "#f8fafc",
                  borderRadius: 12,
                  border: "2px dashed #e2e8f0"
                }}>
                  No attempts found.
                </div>
              ) : (
                <div style={{ 
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                  border: "1px solid #e2e8f0"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ 
                      background: "linear-gradient(to right, #f8fafc, #f1f5f9)"
                    }}>
                      <tr>
                        <th style={{ 
                          padding: 16,
                          textAlign: "left",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          Question ID
                        </th>
                        <th style={{ 
                          padding: 16,
                          textAlign: "left",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          Correct
                        </th>
                        <th style={{ 
                          padding: 16,
                          textAlign: "left",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          When
                        </th>
                      </tr>
                    </thead>
                    <tbody style={{ background: "#fff" }}>
                      {data.attempts.map((a, idx) => (
                        <tr 
                          key={idx}
                          style={{ 
                            borderBottom: "1px solid #f1f5f9",
                            transition: "background 0.15s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                        >
                          <td style={{ padding: 16, color: "#334155", fontWeight: 500 }}>
                            {a.question_id ?? "—"}
                          </td>
                          <td style={{ padding: 16 }}>
                            <span style={{
                              padding: "4px 12px",
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 600,
                              background: a.correct ? "#d1fae5" : "#fee2e2",
                              color: a.correct ? "#065f46" : "#991b1b"
                            }}>
                              {a.correct ? "✓ Yes" : "✗ No"}
                            </span>
                          </td>
                          <td style={{ padding: 16, color: "#64748b" }}>
                            {formatTimestamp(a.time)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h4 style={{ 
                marginBottom: 16,
                fontSize: 20,
                fontWeight: 700,
                color: "#1e293b"
              }}>
                Quiz Results
              </h4>
              {(!data.results || data.results.length === 0) ? (
                <div style={{ 
                  color: "#94a3b8",
                  fontStyle: "italic",
                  padding: 32,
                  textAlign: "center",
                  background: "#f8fafc",
                  borderRadius: 12,
                  border: "2px dashed #e2e8f0"
                }}>
                  No quiz results found.
                </div>
              ) : (
                <div style={{ 
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                  border: "1px solid #e2e8f0"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ 
                      background: "linear-gradient(to right, #f8fafc, #f1f5f9)"
                    }}>
                      <tr>
                        <th style={{ 
                          padding: 16,
                          textAlign: "left",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          Result ID
                        </th>
                        <th style={{ 
                          padding: 16,
                          textAlign: "left",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          Quiz ID
                        </th>
                        <th style={{ 
                          padding: 16,
                          textAlign: "left",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          Score
                        </th>
                        <th style={{ 
                          padding: 16,
                          textAlign: "left",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          When
                        </th>
                        <th style={{ 
                          padding: 16,
                          textAlign: "left",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          Certificate
                        </th>
                      </tr>
                    </thead>
                    <tbody style={{ background: "#fff" }}>
                      {data.results.map(r => (
                        <tr 
                          key={r.id}
                          style={{ 
                            borderBottom: "1px solid #f1f5f9",
                            transition: "background 0.15s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                        >
                          <td style={{ padding: 16, color: "#334155", fontWeight: 500 }}>
                            {r.id}
                          </td>
                          <td style={{ padding: 16, color: "#64748b" }}>
                            {r.quizId ?? "—"}
                          </td>
                          <td style={{ padding: 16 }}>
                            <span style={{
                              fontWeight: 700,
                              color: "#667eea"
                            }}>
                              {r.score}/{r.total}
                            </span>
                          </td>
                          <td style={{ padding: 16, color: "#64748b" }}>
                            {formatTimestamp(r.timestamp)}
                          </td>
                          <td style={{ padding: 16, color: "#64748b" }}>
                            {r.certificate ? `${r.certificate.status}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const resp = await getAllProgress();
        const list = resp?.progress ?? [];
        setRows(list.map(r => ({
          user_id: r.user_id,
          total: Number(r.total || 0),
          correct: Number(r.correct || 0),
          streak: Number(r.streak || 0)
        })));
      } catch (err) {
        console.error("Failed to fetch admin progress:", err);
        setFetchError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function openDetail(userId) {
    setDetailOpen(true);
    setDetailUserId(userId);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    try {
      const resp = await getUserProgress(userId);
      setDetailData(resp);
    } catch (err) {
      console.error("Failed to load user progress:", err);
      setDetailError(err?.response?.data?.message || err?.message || String(err));
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetailUserId(null);
    setDetailData(null);
    setDetailError(null);
  }

  return (
    <div style={{ 
      minHeight: "100vh",
      background: "linear-gradient(to bottom right, #f8fafc 0%, #e2e8f0 100%)",
      padding: 40
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ 
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 16
        }}>
          <div>
            <h2 style={{ 
              margin: 0,
              fontSize: 36,
              fontWeight: 800,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 8
            }}>
              Admin Monitor
            </h2>
            <div style={{ 
              color: "#64748b",
              fontSize: 15,
              fontWeight: 500
            }}>
              Aggregated progress overview for all users
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ 
            padding: 80,
            textAlign: "center",
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)"
          }}>
            <div style={{
              width: 60,
              height: 60,
              border: "5px solid #e2e8f0",
              borderTop: "5px solid #667eea",
              borderRadius: "50%",
              margin: "0 auto 20px",
              animation: "spin 1s linear infinite"
            }}></div>
            <div style={{ color: "#94a3b8", fontSize: 16 }}>Loading progress…</div>
          </div>
        ) : fetchError ? (
          <div style={{ 
            color: "#991b1b",
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            padding: 24,
            borderRadius: 20,
            border: "1px solid #fca5a5",
            boxShadow: "0 4px 16px rgba(220, 38, 38, 0.1)",
            fontSize: 15
          }}>
            {fetchError}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ 
            padding: 80,
            textAlign: "center",
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
            color: "#94a3b8",
            fontSize: 16
          }}>
            No user progress available.
          </div>
        ) : (
          <div style={{ 
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ 
                    background: "linear-gradient(to right, #667eea 0%, #764ba2 100%)"
                  }}>
                    <th style={{ 
                      padding: 20,
                      textAlign: "left",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      User ID
                    </th>
                    <th style={{ 
                      padding: 20,
                      textAlign: "left",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      Total Attempts
                    </th>
                    <th style={{ 
                      padding: 20,
                      textAlign: "left",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      Correct
                    </th>
                    <th style={{ 
                      padding: 20,
                      textAlign: "left",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      Accuracy
                    </th>
                    <th style={{ 
                      padding: 20,
                      textAlign: "left",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      Streak
                    </th>
                    <th style={{ 
                      padding: 20,
                      textAlign: "left",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const acc = r.total ? Math.round((r.correct / r.total) * 100) : 0;
                    return (
                      <tr 
                        key={r.user_id}
                        style={{ 
                          borderBottom: "1px solid #f1f5f9",
                          background: idx % 2 === 0 ? "#fafafa" : "#fff",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f0f4ff";
                          e.currentTarget.style.transform = "scale(1.01)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = idx % 2 === 0 ? "#fafafa" : "#fff";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        <td style={{ 
                          padding: 20,
                          fontWeight: 700,
                          color: "#1e293b",
                          fontSize: 15
                        }}>
                          {r.user_id}
                        </td>
                        <td style={{ padding: 20, color: "#475569", fontWeight: 600 }}>
                          {r.total}
                        </td>
                        <td style={{ padding: 20, color: "#475569", fontWeight: 600 }}>
                          {r.correct}
                        </td>
                        <td style={{ padding: 20 }}>
                          <span style={{
                            padding: "6px 14px",
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 700,
                            background: acc >= 80 
                              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                              : acc >= 60
                              ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                              : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                            color: "#fff",
                            boxShadow: acc >= 80
                              ? "0 4px 12px rgba(16, 185, 129, 0.3)"
                              : acc >= 60
                              ? "0 4px 12px rgba(245, 158, 11, 0.3)"
                              : "0 4px 12px rgba(239, 68, 68, 0.3)"
                          }}>
                            {acc}%
                          </span>
                        </td>
                        <td style={{ 
                          padding: 20,
                          fontWeight: 700,
                          color: "#667eea",
                          fontSize: 16
                        }}>
                          {r.streak}
                        </td>
                        <td style={{ padding: 20 }}>
                          <button
                            onClick={() => openDetail(r.user_id)}
                            style={{
                              padding: "10px 20px",
                              borderRadius: 12,
                              border: "none",
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              color: "#fff",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 14,
                              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = "translateY(-2px)";
                              e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = "translateY(0)";
                              e.target.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <UserDetailModal
          open={detailOpen}
          onClose={closeDetail}
          userId={detailUserId}
          data={detailData}
          loading={detailLoading}
          error={detailError}
        />
      </div>
    </div>
  );
}