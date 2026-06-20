// src/services/api.js  (final, debug-enhanced)
import axios from 'axios';

const BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10s
});

/* ---------- Request interceptor (attach token + debug) ---------- */
api.interceptors.request.use(
  (config) => {
    // check both keys (backwards compatibility)
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[api request]', {
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
        data: config.data,
        headers: { ...(config.headers || {}), Authorization: config.headers?.Authorization ? 'Bearer ****' : undefined }
      });
      if (config.headers?.Authorization) {
        console.info('[api] sending Authorization header (masked)');
      }
    }
    return config;
  },
  (error) => {
    console.error('[api request error]', error);
    return Promise.reject(error);
  }
);

/* ---------- Response interceptor (log + normalize errors) ---------- */
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[api response]', {
        url: response.config?.url,
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  (error) => {
    const debug = {
      message: error.message,
      code: error.code,
      url: error?.config?.url,
      method: error?.config?.method,
      baseURL: error?.config?.baseURL,
      status: error?.response?.status,
      responseData: error?.response?.data,
      request: !!error?.request
    };
    console.error('[api response error]', debug);

    const enhanced = new Error(error.message || 'Network Error');
    enhanced.code = error.code;
    enhanced.status = error?.response?.status;
    enhanced.data = error?.response?.data;
    enhanced.request = error?.request;
    return Promise.reject(enhanced);
  }
);

/* ---------- Token helper: set and remove (saves both keys) ---------- */
export function setAuthToken(token) {
  if (token) {
    // keep both keys in sync (some parts of your app used 'token' key)
    localStorage.setItem('authToken', token);
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
}
export const setToken = setAuthToken;

/* ---------- normalize auth response helper ---------- */
function _normalizeAuthResponse(res) {
  // Accept many shapes: res, res.data, res.data.data
  const raw = res;
  const d = res?.data ?? res ?? {};
  const payload = d?.data ?? d;
  const token = payload?.token || payload?.access_token || d?.token || d?.access_token || null;
  const user = payload?.user || d?.user || null;
  return { token, user, raw: raw?.data ?? raw };
}

/* ---------- API helpers (return normalized auth object) ---------- */
export async function loginUser(credentials) {
  try {
    const res = await api.post('/auth/login', credentials);
    return _normalizeAuthResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function signupUser(payload) {
  try {
    const res = await api.post('/auth/signup', payload);
    return _normalizeAuthResponse(res);
  } catch (err) {
    throw err;
  }
}

export async function getAdminData() {
  try {
    const res = await api.get('/admin/data');
    return res.data;
  } catch (err) {
    throw err;
  }
}

/* ---------- other helpers you may want ---------- */
export async function getQuestions(category = 'aptitude', limit = 10) {
  try {
    const res = await api.get(`/questions/${category}?limit=${limit}`);
    return res.data;
  } catch (err) { throw err; }
}

export default api;
