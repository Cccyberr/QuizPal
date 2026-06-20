// src/pages/TestPage.jsx
import React, { useEffect } from "react";

export default function TestPage() {
  useEffect(() => console.log("TestPage mounted"), []);
  return (
    <div style={{ padding: 32 }}>
      <h2>Routing Test Page</h2>
      <p>If you see this, routing is wired correctly.</p>
    </div>
  );
}
