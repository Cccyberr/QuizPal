// src/index.js
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { setAuthToken } from "./services/api";
import "./index.css";

const token = localStorage.getItem("authToken") || localStorage.getItem("token");
if (token) setAuthToken(token);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
