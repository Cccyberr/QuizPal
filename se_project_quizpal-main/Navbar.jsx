// src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav style={{ padding: '10px 20px', borderBottom: '1px solid #ddd' }}>
      <Link to="/login" style={{ marginRight: 10 }}>Login</Link>
      <Link to="/signup" style={{ marginRight: 10 }}>Signup</Link>
      <Link to="/admin">Admin</Link>
    </nav>
  );
}
