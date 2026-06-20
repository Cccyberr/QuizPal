// src/pages/AdminLogin.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginUser, setAuthToken, me } from "../services/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // redirect already-authenticated admin straight to admin dashboard
  useEffect(() => {
    const t = localStorage.getItem("authToken") || localStorage.getItem("token");
    const isAdmin =
      localStorage.getItem("authIsAdmin") === "true" ||
      localStorage.getItem("isAdmin") === "true";
    if (t && isAdmin) navigate("/admin/dashboard", { replace: true });
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const resp = await loginUser({ email, password });
      const token = resp?.token;
      const user = resp?.user ?? resp?.raw?.user ?? null;

      if (!token) {
        setErr("Login succeeded but server did not return a token.");
        setLoading(false);
        return;
      }

      // set axios header for subsequent requests
      setAuthToken(token);

      // persist token & basic user info
      localStorage.setItem("authToken", token);
      localStorage.setItem("token", token);
      if (user?.id) localStorage.setItem("authId", String(user.id));
      if (user?.email) localStorage.setItem("authEmail", user.email);
      if (user?.name) localStorage.setItem("authName", user.name);

      // if backend indicates admin, set admin flags
      if (user?.is_admin || user?.isAdmin || user?.role === "admin") {
        try {
          localStorage.setItem("authIsAdmin", "true");
          localStorage.setItem("isAdmin", "true");
        } catch (e) { /* ignore */ }
        const from = location.state?.from?.pathname || "/admin/dashboard";
        navigate(from, { replace: true });
      } else {
        localStorage.removeItem("authIsAdmin");
        localStorage.removeItem("isAdmin");
        const from = location.state?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error("Admin login error:", error);
      setErr(error?.response?.data?.message || error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
    
  }

  // small helpers for focus/blur styling without inline mutation of event.target (safer for lint/parsers)
  const inputBase = {
    width: "100%",
    padding: "16px 16px 16px 50px",
    fontSize: 15,
    fontWeight: 500,
    border: "2px solid #e2e8f0",
    borderRadius: 14,
    outline: "none",
    transition: "all 0.2s ease",
    background: "#fafafa",
    color: "#2d3748",
    boxSizing: "border-box"
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* animated blurred circles */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "10%",
          width: 400,
          height: 400,
          background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 20s ease-in-out infinite"
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "10%",
          width: 500,
          height: 500,
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
          animation: "float 25s ease-in-out infinite reverse"
        }}
      />

      <div style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 80,
              height: 80,
              margin: "0 auto 20px",
              borderRadius: 24,
              background: "rgba(255,255,255,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 900,
              color: "#f5576c",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              position: "relative"
            }}
          >
            👑
            <div
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: 28,
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                opacity: 0.3,
                filter: "blur(12px)",
                zIndex: -1
              }}
            />
          </div>
          <h1 style={{
            fontSize: 36,
            fontWeight: 900,
            color: "#fff",
            margin: 0,
            marginBottom: 8,
            textShadow: "0 4px 20px rgba(0,0,0,0.2)",
            letterSpacing: "-0.5px"
          }}>Admin Portal</h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", margin: 0, fontWeight: 500 }}>
            Secure access for administrators only
          </p>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(20px)",
          borderRadius: 28,
          padding: 40,
          boxShadow: "0 30px 90px rgba(0,0,0,0.25), 0 10px 30px rgba(0,0,0,0.15)",
          border: "1px solid rgba(255,255,255,0.8)"
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#2d3748", marginBottom: 10 }}>
                Admin Email
              </label>
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 20,
                  color: "#a0aec0"
                }}>🔐</div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter admin email"
                  style={{ ...inputBase, paddingLeft: 50 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#2d3748", marginBottom: 10 }}>
                Admin Password
              </label>
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 20,
                  color: "#a0aec0"
                }}>🔑</div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter admin password"
                  style={{ ...inputBase, paddingRight: 50 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="toggle password"
                  style={{
                    position: "absolute",
                    right: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 18,
                    padding: 4,
                    color: "#a0aec0"
                  }}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {err && (
              <div style={{
                padding: "14px 18px",
                background: "linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)",
                borderRadius: 12,
                marginBottom: 24,
                border: "2px solid #fc8181",
                display: "flex",
                alignItems: "center",
                gap: 12,
                animation: "shake 0.5s ease"
              }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#742a2a", flex: 1 }}>{err}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "18px 24px",
                fontSize: 16,
                fontWeight: 800,
                color: "#fff",
                background: loading ? "linear-gradient(135deg, #a0aec0 0%, #718096 100%)" : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                border: "none",
                borderRadius: 14,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: loading ? "none" : "0 12px 40px rgba(245,87,108,0.4), 0 4px 12px rgba(245,87,108,0.2)",
                position: "relative",
                overflow: "hidden",
                marginBottom: 16
              }}
            >
              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                {loading ? (
                  <>
                    <div style={{
                      width: 18,
                      height: 18,
                      border: "3px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }} />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 18 }}>👑</span>
                    <span>Sign In as Admin</span>
                  </>
                )}
              </div>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "1px" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  width: "100%",
                  padding: "18px 24px",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#f5576c",
                  background: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
                  border: "2px solid #e2e8f0",
                  borderRadius: 14,
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
              >
                Not an admin? <strong>User Login</strong>
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/signup")}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  background: "linear-gradient(135deg, #6ee7b7 0%, #3b82f6 100%)",
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                Create Admin Account
              </button>
            </div>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
          🔒 Secure admin authentication with role verification
        </p>
      </div>

      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-30px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
      `}</style>
    </div>
  );
} 