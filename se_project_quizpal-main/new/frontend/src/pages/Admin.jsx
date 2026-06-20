// src/pages/Admin.jsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import '../styles/theme.css';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=> {
    (async ()=>{
      try {
        const res = await api.get('/admin/users');
        setUsers(res.data.users || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const issue = async (uid) => {
    try {
      const res = await api.post('/admin/issue_certificate', { user_id: uid }, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `certificate_${uid}.pdf`; a.click();
    } catch (e) { console.error(e); alert('Issue failed'); }
  };

  return (
    <div className="app-wrap">
      <div className="app-header">
        <div className="brand">
          <div className="logo">Q</div>
          <h1>QuizPal Admin</h1>
        </div>
      </div>

      <div className="card">
        <h2 style={{marginTop:0}}>Users</h2>
        {loading ? <div className="hint">Loading...</div> : (
          <>
            <table className="table">
              <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Admin</th><th>Action</th></tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.is_admin ? 'Yes' : 'No'}</td>
                    <td><button className="btn btn-primary" onClick={()=>issue(u.id)}>Issue Cert</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
