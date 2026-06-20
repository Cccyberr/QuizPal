// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginUser, setAuthToken } from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const t = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (t) navigate("/dashboard", { replace: true });
  }, [navigate]);

    async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const resp = await loginUser({ email, password });
      const token = resp?.token;
      const user = resp?.user ?? resp?.raw?.user ?? null;

      if (!token) {
        setErr("Login succeeded but server did not return a token.");
        setLoading(false);
        return;
      }

      // set axios header
      setAuthToken(token);

      // persist in localStorage
      localStorage.setItem("authToken", token);
      localStorage.setItem("token", token);

      // store the full user object (important — other pages read localStorage.getItem("user"))
      if (user) {
        try {
          localStorage.setItem("user", JSON.stringify(user));
        } catch (err) {
          // fallback: store basic fields separately if JSON fails
          if (user?.id) localStorage.setItem("authId", String(user.id));
          if (user?.email) localStorage.setItem("authEmail", user.email);
          if (user?.name) localStorage.setItem("authName", user.name);
          if (user?.is_admin) {
            localStorage.setItem("authIsAdmin", "true");
            localStorage.setItem("isAdmin", "true");
          }
        }
      } else {
        // If server didn't return a full user object, at least save the individual fields we already had
        // (this keeps backwards compatibility with your existing code)
        // the next lines are harmless if you already set them above
        if (user?.id) localStorage.setItem("authId", String(user.id));
        if (user?.email) localStorage.setItem("authEmail", user?.email);
        if (user?.name) localStorage.setItem("authName", user?.name);
        if (user?.is_admin) {
          localStorage.setItem("authIsAdmin", "true");
          localStorage.setItem("isAdmin", "true");
        }
      }

      // navigate to originally intended page (if any) or dashboard
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Login error:", error);
      setErr(error?.response?.data?.message || error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Animated background elements */}
      <div style={{
        position: "absolute",
        top: "10%",
        left: "10%",
        width: 400,
        height: 400,
        background: "radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(60px)",
        animation: "float 20s ease-in-out infinite"
      }} />
      <div style={{
        position: "absolute",
        bottom: "10%",
        right: "10%",
        width: 500,
        height: 500,
        background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(80px)",
        animation: "float 25s ease-in-out infinite reverse"
      }} />

      {/* Login Card */}
      <div style={{
        width: "100%",
        maxWidth: 460,
        position: "relative",
        zIndex: 1
      }}>
        {/* Logo & Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 80,
            height: 80,
            margin: "0 auto 20px",
            borderRadius: 24,
            background: "rgba(255, 255, 255, 0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            fontWeight: 900,
            color: "#667eea",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            position: "relative"
          }}>
            Q
            <div style={{
              position: "absolute",
              inset: -4,
              borderRadius: 28,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              opacity: 0.3,
              filter: "blur(12px)",
              zIndex: -1
            }} />
          </div>
          <h1 style={{
            fontSize: 36,
            fontWeight: 900,
            color: "#fff",
            margin: 0,
            marginBottom: 8,
            textShadow: "0 4px 20px rgba(0,0,0,0.2)",
            letterSpacing: "-0.5px"
          }}>
            Welcome Back
          </h1>
          <p style={{
            fontSize: 15,
            color: "rgba(255, 255, 255, 0.85)",
            margin: 0,
            fontWeight: 500
          }}>
            Sign in to continue your learning journey
          </p>
        </div>

        {/* Login Form Card */}
        <div style={{
          background: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(20px)",
          borderRadius: 28,
          padding: 40,
          boxShadow: "0 30px 90px rgba(0,0,0,0.25), 0 10px 30px rgba(0,0,0,0.15)",
          border: "1px solid rgba(255, 255, 255, 0.8)"
        }}>
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                color: "#2d3748",
                marginBottom: 10,
                letterSpacing: "0.3px"
              }}>
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 20,
                  color: "#a0aec0"
                }}>
                  📧
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  style={{
                    width: "100%",
                    padding: "16px 16px 16px 50px",
                    fontSize: 15,
                    fontWeight: 500,
                    border: "2px solid #e2e8f0",
                    borderRadius: 14,
                    outline: "none",
                    transition: "all 0.3s ease",
                    background: "#fafafa",
                    color: "#2d3748",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "2px solid #667eea";
                    e.target.style.background = "#fff";
                    e.target.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "2px solid #e2e8f0";
                    e.target.style.background = "#fafafa";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                color: "#2d3748",
                marginBottom: 10,
                letterSpacing: "0.3px"
              }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 20,
                  color: "#a0aec0"
                }}>
                  🔒
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  style={{
                    width: "100%",
                    padding: "16px 50px 16px 50px",
                    fontSize: 15,
                    fontWeight: 500,
                    border: "2px solid #e2e8f0",
                    borderRadius: 14,
                    outline: "none",
                    transition: "all 0.3s ease",
                    background: "#fafafa",
                    color: "#2d3748",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "2px solid #667eea";
                    e.target.style.background = "#fff";
                    e.target.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "2px solid #e2e8f0";
                    e.target.style.background = "#fafafa";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
                    color: "#a0aec0",
                    transition: "color 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.target.style.color = "#667eea"}
                  onMouseLeave={(e) => e.target.style.color = "#a0aec0"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Error Message */}
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
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#742a2a",
                  flex: 1
                }}>
                  {err}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "18px 24px",
                fontSize: 16,
                fontWeight: 800,
                color: "#fff",
                background: loading
                  ? "linear-gradient(135deg, #a0aec0 0%, #718096 100%)"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: 14,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: loading 
                  ? "none"
                  : "0 12px 40px rgba(102, 126, 234, 0.4), 0 4px 12px rgba(102, 126, 234, 0.2)",
                position: "relative",
                overflow: "hidden",
                marginBottom: 16
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 16px 50px rgba(102, 126, 234, 0.5), 0 6px 16px rgba(102, 126, 234, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 12px 40px rgba(102, 126, 234, 0.4), 0 4px 12px rgba(102, 126, 234, 0.2)";
                }
              }}
            >
              <div style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10
              }}>
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <span style={{ fontSize: 18 }}>→</span>
                  </>
                )}
              </div>
              {!loading && (
                <div style={{
                  position: "absolute",
                  inset: -2,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  opacity: 0.4,
                  filter: "blur(16px)",
                  zIndex: 0
                }} />
              )}
            </button>

            {/* Divider */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 16
            }}>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#a0aec0",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}>
                or
              </span>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            </div>

            {/* Sign Up Button */}
            <button
              type="button"
              onClick={() => navigate("/signup")}
              style={{
                width: "100%",
                padding: "18px 24px",
                fontSize: 16,
                fontWeight: 700,
                color: "#667eea",
                background: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
                border: "2px solid #e2e8f0",
                borderRadius: 14,
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#fff";
                e.target.style.borderColor = "#667eea";
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)";
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              Don't have an account? <strong>Sign Up</strong>
            </button>
          </form>
        </div>

        {/* Footer Text */}
        <p style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: 13,
          color: "rgba(255, 255, 255, 0.8)",
          fontWeight: 500
        }}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
}