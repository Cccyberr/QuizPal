// src/components/AdminRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  // read from localStorage (what your signup sets)
  const token = localStorage.getItem("authToken") || localStorage.getItem("token");
  const isAdmin = localStorage.getItem("authIsAdmin") === "true" || localStorage.getItem("isAdmin") === "true";

  // if no token -> go to admin login
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  // if token present but not admin -> send to normal dashboard or login
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // authorized => render children (admin UI)
  return <>{children}</>;
}
