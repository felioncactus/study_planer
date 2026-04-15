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
      <div className="auth-panel auth-panel-copy">
        <div className="auth-badge">Kepka</div>
        <h1 className="auth-hero-title">A calmer workspace for courses, tasks, notes, and friends.</h1>
        <p className="auth-hero-text">
          Keep your semester organized with a product that feels structured, readable, and built for real daily use.
        </p>
        <div className="auth-feature-list">
          <div className="auth-feature-item"><strong>Plan intelligently</strong><span>Review tasks, classes, and daily timelines in one place.</span></div>
          <div className="auth-feature-item"><strong>Stay connected</strong><span>Message classmates, manage requests, and keep notes nearby.</span></div>
          <div className="auth-feature-item"><strong>Move quickly</strong><span>Focused forms, clear hierarchy, and responsive layouts across devices.</span></div>
        </div>
      </div>

      <div className="auth-card card">
        <div className="auth-header">
          <div className="auth-badge auth-badge-subtle">Welcome back</div>
          <div className="title auth-title">Log in to your workspace</div>
          <div className="muted small">Use your existing account to continue.</div>
        </div>

        <form className="form-grid auth-form" onSubmit={onSubmit}>
          <label className="auth-label" htmlFor="email">
            <span>Email</span>
            <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>

          <label className="auth-label" htmlFor="password">
            <span>Password</span>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
