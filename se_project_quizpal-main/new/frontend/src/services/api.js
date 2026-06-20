// src/services/api.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

/* -------------------
   Token helpers
   ------------------- */
function getStoredToken() {
  return (
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    null
  );
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

/* Attach token automatically if not present on request config */
api.interceptors.request.use(
  (config) => {
    const hasAuth =
      !!(
        config.headers &&
        (config.headers.Authorization || config.headers.authorization)
      );
    if (!hasAuth) {
      const token = getStoredToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* Response interceptor logs helpful info on failures */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // give detailed debug info to console (safe for dev)
    console.error("API response error:", {
      message: error.message,
      url: error?.config?.url,
      method: error?.config?.method,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    return Promise.reject(error);
  }
);

/* -------------------
   Auth
   ------------------- */

/**
 * loginUser(credentials) -> { token, user, raw }
 * Expect server to return { token, user } (adjust if your server differs)
 */
export async function loginUser(credentials) {
  const resp = await api.post("/auth/login", credentials);
  return {
    token: resp?.data?.token ?? null,
    user: resp?.data?.user ?? resp?.data ?? null,
    raw: resp?.data,
  };
}

export async function signupUser(payload) {
  const resp = await api.post("/auth/signup", payload);
  return {
    token: resp?.data?.token ?? null,
    user: resp?.data?.user ?? resp?.data ?? null,
    raw: resp?.data,
  };
}

export async function me() {
  const r = await api.get("/auth/me");
  return r.data;
}

/* -------------------
   Questions
   ------------------- */
export async function fetchQuestions(category, params = {}) {
  const r = await api.get(`/questions/${category}`, { params });
  return r.data;
}

/* -------------------
   Results / Certificates
   ------------------- */
export async function createResult(payload) {
  const r = await api.post("/results", payload);
  return r.data;
}

export async function requestCertificate(payload) {
  try {
    const candidate =
      payload?.subject ??
      payload?.subjectInput ??
      payload?.quizTitle ??
      (payload?.quiz && (payload.quiz.title ?? payload.quiz.name)) ??
      payload?.quizId ??
      payload?.quiz_id ??
      payload?.resultTitle ??
      "Certificate";

    let subjectStr = "";
    if (typeof candidate === "string") subjectStr = candidate.trim();
    else if (candidate == null) subjectStr = "";
    else if (typeof candidate === "number" || typeof candidate === "boolean")
      subjectStr = String(candidate);
    else if (typeof candidate === "object" && candidate.toString)
      subjectStr = String(candidate).trim();
    else subjectStr = "";
    if (!subjectStr) subjectStr = "Certificate";

    const quizIdStr =
      payload?.quizId ??
      payload?.quiz_id ??
      (payload?.quiz && (payload.quiz.id ?? payload.quizId)) ??
      null;
    const resultIdVal = payload?.resultId ?? payload?.result_id ?? null;

    const body = {
      subject: subjectStr,
      subject_text: subjectStr,
      quizId: quizIdStr != null ? String(quizIdStr) : undefined,
      quiz_id: quizIdStr != null ? String(quizIdStr) : undefined,
      resultId: resultIdVal != null ? resultIdVal : undefined,
      result_id: resultIdVal != null ? resultIdVal : undefined,
      score: payload?.score,
      total: payload?.total,
      difficulty: payload?.difficulty ?? payload?.level ?? "easy",
      ...payload,
    };

    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

    // debug
    console.log("requestCertificate -> sending body:", body);

    const r = await api.post("/certificate/request", body);
    return r.data;
  } catch (origErr) {
    const err = origErr || new Error("Unknown requestCertificate error");
    const respData = err?.response?.data;
    let msg = "Network/server error - check console";
    if (respData) msg = respData.message ?? respData.msg ?? JSON.stringify(respData);
    else if (err?.response) msg = `Server error ${err.response.status}`;
    else if (err?.message) msg = err.message;
    const e = new Error(msg);
    e.raw = origErr;
    throw e;
  }
}

/* -------------------
   Progress saving & helpers
   ------------------- */

/**
 * saveProgress(payload)
 * POST /api/progress
 * This is intended for saving quiz-level progress payloads (score/total/breakdown)
 */
export async function saveProgress(payload) {
  try {
    // ensure token on header (api interceptor should already attach but keep safe header)
    const token = getStoredToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const filtered = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    );

    const r = await api.post("/progress", filtered, { headers });
    return r.data;
  } catch (err) {
    console.error("saveProgress error", err);
    const msg = err?.response?.data?.message || err?.message || "Failed to save progress";
    const e = new Error(msg);
    e.raw = err;
    throw e;
  }
}

/**
 * recordAttempt({ question_id, correct })
 * POST /api/progress/record
 * Small per-question attempt logging (boolean correct).
 */
export async function recordAttempt({ question_id = null, correct = false } = {}) {
  const r = await api.post("/progress/record", { question_id, correct });
  return r.data;
}

/* alias convenience wrapper for results recording */
export async function recordResult(payload) {
  const r = await api.post("/results", payload);
  return r.data;
}

/* -------------------
   Admin helpers & progress reads
   ------------------- */

/* pending certificate requests (admin) */
export async function getPendingCertificateRequests() {
  const r = await api.get("/certificate/requests/pending");
  return r.data;
}

export async function approveCertificateRequest(requestId) {
  const r = await api.post(`/certificate/requests/${requestId}/approve`);
  return r.data;
}

/* fetch single user's progress (SQL-backed endpoint) */
export async function getUserProgress(userId) {
  const r = await api.get(`/progress/${userId}`);
  return r.data;
}

/* If you added/plan to use the SQL route /progress/sql/:id (raw SQL) */
export async function getUserProgressSql(userId) {
  const r = await api.get(`/progress/sql/${userId}`);
  return r.data;
}

/* admin aggregated progress */
export async function getAllProgress() {
  const r = await api.get("/admin/progress");
  return r.data;
}

/* -------------------
   Export default axios instance
   ------------------- */
export default api;
