import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password });
      nav("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Login failed");
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-header">
          <div className="title auth-title">Welcome back</div>
          <div className="muted small">Log in to continue.</div>
        </div>

        <form className="form-grid" onSubmit={onSubmit} style={{ gap: 16 }}>
          <label className="auth-label">
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>

          <label className="auth-label">
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error ? <div className="notice notice-danger small">{error}</div> : null}

          <button className="btn btn-primary auth-submit" type="submit">
            Login
          </button>

          <div className="small muted auth-footer">
            No account? <Link to="/register">Register</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
