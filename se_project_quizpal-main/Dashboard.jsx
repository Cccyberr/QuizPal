// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import '../styles/theme.css';

export default function Dashboard() {
  // quick guard: if no token, show prompt right away
  if (!localStorage.getItem('authToken')) {
    return (
      <div className="app-wrap">
        <div className="card">
          <h2>Please login</h2>
          <p className="hint">You need to sign in to see your dashboard.</p>
        </div>
      </div>
    );
  }

  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=> {
    (async ()=> {
      try {
        const meRes = await api.get('/auth/me').catch(()=>null);
        setMe(meRes?.data?.user ?? null);
        if (meRes?.data?.user?.id) {
          const uid = meRes.data.user.id;
          const p = await api.get(`/progress/${uid}`).catch(()=>null);
          setStats(p?.data ?? null);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="app-wrap">
      <div className="app-header">
        <div className="brand">
          <div className="logo">Q</div>
          <h1>QuizPal</h1>
        </div>
        <div className="header-actions">
          <div className="hint">{me ? `Hello, ${me.name}` : 'Not signed in'}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{marginTop:0}}>Your Dashboard</h2>
        {loading ? <div className="hint">Loading...</div> : (
          <>
            {!me && <div className="hint">Please login to track progress.</div>}
            {me && (
              <>
                <div className="grid-3" style={{marginTop:12}}>
                  <div className="stat-card">
                    <div className="hint">Attempts</div>
                    <div style={{fontSize:20, fontWeight:700}}>{stats?.stats?.total ?? 0}</div>
                  </div>
                  <div className="stat-card">
                    <div className="hint">Correct</div>
                    <div style={{fontSize:20, fontWeight:700}}>{stats?.stats?.correct ?? 0}</div>
                  </div>
                  <div className="stat-card">
                    <div className="hint">Accuracy</div>
                    <div style={{fontSize:20, fontWeight:700}}>
                      {stats?.stats?.total ? Math.round((stats.stats.correct / stats.stats.total) * 100) + '%' : '0%'}
                    </div>
                  </div>
                </div>

                <h3 style={{marginTop:18}}>Recent attempts</h3>
                <table className="table">
                  <thead><tr><th>Question</th><th>Result</th><th>When</th></tr></thead>
                  <tbody>
                    {(stats?.attempts ?? []).slice(-8).reverse().map((a,i)=>(
                      <tr key={i}>
                        <td>{a.question_id}</td>
                        <td>{a.correct ? <span className="success">Correct</span> : <span className="error">Wrong</span>}</td>
                        <td>{new Date(a.time*1000).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
