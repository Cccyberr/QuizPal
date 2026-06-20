// src/pages/Signup.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signupUser, setAuthToken } from '../services/api';
import '../styles/theme.css';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const data = await signupUser({ name, email, password });
      if (data?.token) {
        setAuthToken(data.token);
        navigate('/dashboard');
      } else {
        setErr('Signup failed: no token returned');
      }
    } catch (error) {
      setErr(error?.data?.message || error?.message || 'Signup failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="app-wrap">
      <div className="app-header">
        <div className="brand">
          <div className="logo">Q</div>
          <h1>QuizPal</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={()=>navigate('/login')}>Login</button>
        </div>
      </div>

      <div className="card">
        <h2 style={{marginTop:0}}>Create account</h2>
        <p className="hint">Sign up to save progress and earn certificates.</p>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Full name</label>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} required />
          </div>

          <div className="field">
            <label className="label">Email</label>
            <input className="input" value={email} onChange={e=>setEmail(e.target.value)} required type="email" />
          </div>

          <div className="field">
            <label className="label">Password</label>
            <input className="input" value={password} onChange={e=>setPassword(e.target.value)} required type="password" />
            <div className="hint">Use 8 or more characters for a strong password.</div>
          </div>

          {err && <div className="error" style={{marginBottom:12}}>{err}</div>}

          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create account'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={()=>navigate('/')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
