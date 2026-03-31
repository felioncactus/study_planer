import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function randomEmail() {
  return `user${Math.floor(Math.random() * 10000)}@example.com`;
}

export default function Register() {
  const { user, register } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState("Test User");
  const [email, setEmail] = useState(randomEmail);
  const [password, setPassword] = useState("Password123!");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [error, setError] = useState("");

  const avatarPreview = useMemo(() => avatarUrl, [avatarUrl]);

  async function onPickAvatar(file) {
    setError("");
    if (!file) {
      setAvatarUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Avatar must be an image file.");
      return;
    }
    if (file.size > 1_000_000) {
      setError("Avatar too large. Please use an image under 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result));
    reader.onerror = () => setError("Failed to read image.");
    reader.readAsDataURL(file);
  }

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      await register({ name, email, password, avatarUrl });
      nav("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Registration failed");
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-header">
          <div className="title auth-title">Create account</div>
          <div className="muted small">Minimal setup — you can change everything later.</div>
        </div>

        <form className="form-grid" onSubmit={onSubmit} style={{ gap: 16 }}>
          <div className="two-col">
            <label className="auth-label">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </label>

            <label className="auth-label">
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
          </div>

          <label className="auth-label">
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          <div className="row">
            <div className="avatar" style={{ width: 52, height: 52 }}>
              {avatarPreview ? <img src={avatarPreview} alt="preview" /> : <span className="small">🙂</span>}
            </div>

            <div style={{ flex: 1 }}>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
                style={{ display: "none" }}
              />
              <label htmlFor="avatar" className="btn btn-ghost" style={{ display: "inline-flex" }}>
                Choose avatar
              </label>
            </div>
          </div>

          {error ? <div className="notice notice-danger small">{error}</div> : null}

          <button className="btn btn-primary auth-submit" type="submit">
            Create account
          </button>

          <div className="small muted auth-footer">
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
