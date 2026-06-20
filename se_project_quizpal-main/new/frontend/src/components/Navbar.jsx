// src/components/Navbar.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

/**
 * Navbar for QuizPal
 * - Shows user links only to non-admin authenticated users
 * - Always shows Admin Login so admins can access it even when not signed-in
 * - Shows Admin Dashboard only to signed-in admins
 */
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // token presence -> considered logged-in
  const token = localStorage.getItem("authToken") || localStorage.getItem("token");
  const email = localStorage.getItem("authEmail") || localStorage.getItem("authName") || localStorage.getItem("user");
  const name = localStorage.getItem("authName") || email?.split("@")[0] || "User";
  const isAdmin = (localStorage.getItem("authIsAdmin") === "true") || (localStorage.getItem("isAdmin") === "true");

  const logout = () => {
    // Remove all auth-related keys
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("authId");
    localStorage.removeItem("authEmail");
    localStorage.removeItem("authName");
    localStorage.removeItem("authIsAdmin");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("user");
    
    navigate("/login", { replace: true });
    window.location.reload();
  };

  const isActive = (path) => location.pathname === path;

  const getInitials = () => {
    return name?.[0]?.toUpperCase() || "U";
  };

  return (
    <header style={{
      background: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
      position: "sticky",
      top: 0,
      zIndex: 1000,
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)"
    }}>
      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        {/* Logo */}
        <Link
          to={token ? (isAdmin ? "/admin/dashboard" : "/dashboard") : "/"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            transition: "transform 0.2s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: isAdmin 
              ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 900,
            color: "#fff",
            boxShadow: isAdmin
              ? "0 4px 15px rgba(245, 87, 108, 0.3)"
              : "0 4px 15px rgba(102, 126, 234, 0.3)"
          }}>
            {isAdmin ? "👑" : "Q"}
          </div>
          <div>
            <div style={{
              fontSize: 22,
              fontWeight: 900,
              background: isAdmin
                ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px"
            }}>
              QuizPal
            </div>
            {isAdmin && (
              <div style={{
                fontSize: 10,
                color: "#f5576c",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginTop: -2
              }}>
                Admin Portal
              </div>
            )}
          </div>
        </Link>

        {/* Navigation Links */}
        <nav style={{
          display: "flex",
          gap: 8,
          alignItems: "center"
        }}>
          {/* User-only links (non-admins) */}
          {token && !isAdmin && (
            <>
              <Link
                to="/dashboard"
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  color: isActive("/dashboard") ? "#fff" : "#4a5568",
                  background: isActive("/dashboard")
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "transparent",
                  textDecoration: "none",
                  transition: "all 0.3s ease",
                  boxShadow: isActive("/dashboard") ? "0 4px 15px rgba(102, 126, 234, 0.3)" : "none"
                }}
                onMouseEnter={(e) => {
                  if (!isActive("/dashboard")) {
                    e.target.style.background = "#f7fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/dashboard")) {
                    e.target.style.background = "transparent";
                  }
                }}
              >
                📊 Dashboard
              </Link>

              <Link
                to="/progress"
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  color: isActive("/progress") ? "#fff" : "#4a5568",
                  background: isActive("/progress")
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "transparent",
                  textDecoration: "none",
                  transition: "all 0.3s ease",
                  boxShadow: isActive("/progress") ? "0 4px 15px rgba(102, 126, 234, 0.3)" : "none"
                }}
                onMouseEnter={(e) => {
                  if (!isActive("/progress")) {
                    e.target.style.background = "#f7fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/progress")) {
                    e.target.style.background = "transparent";
                  }
                }}
              >
                📈 Progress
              </Link>
            </>
          )}

          {/* Admin-only link */}
          {token && isAdmin && (
            <Link
              to="/admin/dashboard"
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                color: isActive("/admin/dashboard") ? "#fff" : "#4a5568",
                background: isActive("/admin/dashboard")
                  ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                  : "transparent",
                textDecoration: "none",
                transition: "all 0.3s ease",
                boxShadow: isActive("/admin/dashboard") ? "0 4px 15px rgba(245, 87, 108, 0.3)" : "none"
              }}
              onMouseEnter={(e) => {
                if (!isActive("/admin/dashboard")) {
                  e.target.style.background = "#fef2f2";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive("/admin/dashboard")) {
                  e.target.style.background = "transparent";
                }
              }}
            >
              👑 Admin Dashboard
            </Link>
          )}

          {/* Admin Login - always visible when not logged in as admin */}
          {!isAdmin && (
            <Link
              to="/admin/login"
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                color: isActive("/admin/login") ? "#fff" : "#4a5568",
                background: isActive("/admin/login")
                  ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                  : "transparent",
                textDecoration: "none",
                transition: "all 0.3s ease",
                boxShadow: isActive("/admin/login") ? "0 4px 15px rgba(245, 87, 108, 0.3)" : "none"
              }}
              onMouseEnter={(e) => {
                if (!isActive("/admin/login")) {
                  e.target.style.background = "#fef2f2";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive("/admin/login")) {
                  e.target.style.background = "transparent";
                }
              }}
            >
              🔐 Admin
            </Link>
          )}
        </nav>

        {/* User Profile / Auth Section */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {token ? (
            <div style={{ position: "relative" }}>
              {/* User Avatar Button */}
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 16px",
                  borderRadius: 12,
                  border: "2px solid #e2e8f0",
                  background: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  outline: "none"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isAdmin ? "#f5576c" : "#667eea";
                  e.currentTarget.style.boxShadow = isAdmin
                    ? "0 4px 15px rgba(245, 87, 108, 0.15)"
                    : "0 4px 15px rgba(102, 126, 234, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: isAdmin
                    ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 14,
                  boxShadow: isAdmin
                    ? "0 2px 8px rgba(245, 87, 108, 0.3)"
                    : "0 2px 8px rgba(102, 126, 234, 0.3)"
                }}>
                  {getInitials()}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#2d3748",
                    maxWidth: 150,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {name}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: "#718096",
                    fontWeight: 500
                  }}>
                    {isAdmin ? "Administrator" : "Student"}
                  </div>
                </div>
                <div style={{
                  fontSize: 18,
                  color: "#a0aec0",
                  transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease"
                }}>
                  ▼
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  minWidth: 220,
                  background: "#fff",
                  borderRadius: 14,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                  border: "1px solid #e2e8f0",
                  padding: 8,
                  zIndex: 1001,
                  animation: "slideDown 0.2s ease"
                }}>
                  {/* User Info */}
                  <div style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #e2e8f0",
                    marginBottom: 8
                  }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#2d3748",
                      marginBottom: 4
                    }}>
                      {name}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: "#718096",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {email}
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={logout}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "none",
                      background: "transparent",
                      color: "#ef4444",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#fef2f2";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "transparent";
                    }}
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              style={{
                padding: "10px 24px",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                textDecoration: "none",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
                transition: "all 0.3s ease",
                display: "inline-block"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.3)";
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </header>
  );
}