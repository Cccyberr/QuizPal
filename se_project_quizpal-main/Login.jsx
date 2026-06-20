// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, setAuthToken } from '../services/api';
import '../styles/theme.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const resp = await loginUser({ email, password });
      // loginUser (normalized) returns { token, user, raw }
      console.debug('login response (normalized):', resp);

      const token = resp?.token;
      if (token) {
        // store token and attach header for future axios requests
        setAuthToken(token);
        // also keep a copy of user if returned
        if (resp.user) localStorage.setItem('user', JSON.stringify(resp.user));
        console.info('Auth token saved (masked):', token ? '****' : 'none');
        navigate('/dashboard');
      } else {
        console.warn('No token returned from login. Raw response:', resp?.raw);
        setErr('Login succeeded but token not found. See console for details.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setErr(error?.data?.message || error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-wrap">
      <div className="app-header">
        <div className="brand">
          <div className="logo">Q</div>
          <h1>QuizPal</h1>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Sign in</h2>
        <p className="hint">Sign in to track progress and get certificates.</p>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}

          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/signup')}>
              Signup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
