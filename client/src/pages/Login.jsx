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
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: "min(520px, 100%)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px 32px 32px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              className="title"
              style={{ fontSize: 28, fontWeight: 700, color: "#333" }}
            >
              Welcome back
            </div>
            <div className="muted small" style={{ color: "#666" }}>
              Log in to continue.
            </div>
          </div>

          <form className="form-grid" onSubmit={onSubmit} style={{ gap: 16 }}>
            <label style={{ fontWeight: 500, color: "#333" }}>
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  padding: "12px 16px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 16,
                }}
              />
            </label>
            <label style={{ fontWeight: 500, color: "#333" }}>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: "12px 16px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 16,
                }}
              />
            </label>

            {error && (
              <div className="small" style={{ color: "var(--danger)" }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              style={{
                padding: "12px 24px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: 8,
                color: "white",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              Login
            </button>

            <div
              className="small muted"
              style={{ textAlign: "center", marginTop: 16 }}
            >
              No account?{" "}
              <Link
                to="/register"
                style={{
                  color: "#667eea",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Register
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
