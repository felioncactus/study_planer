import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password });
      nav("/", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Login failed");
    }
  }

  return (
    <div className="container" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <div className="card" style={{ width: "min(520px, 100%)" }}>
        <div className="page-title">
          <div>
            <div className="title">Welcome back</div>
            <div className="muted small">Log in to continue.</div>
          </div>
          <Link className="small" to="/register">
            Register
          </Link>
        </div>

        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && (
            <div className="small" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit">
            Login
          </button>

          <div className="small muted">
            No account? <Link to="/register">Register</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
