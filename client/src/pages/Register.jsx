import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

function randomEmail() {
  return `user${Math.floor(Math.random() * 10000)}@example.com`;
}

export default function Register() {
  const { user, register } = useAuth();
  const { language, setLanguage, languages, t } = useLanguage();
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
      await register({ name, email, password, avatarUrl, language });
      nav("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Registration failed");
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel auth-panel-copy">
        <div className="auth-badge">New here?</div>
        <h1 className="auth-hero-title">Create a study workspace that already feels organized.</h1>
        <p className="auth-hero-text">
          Setup is intentionally lightweight. You can add course art, notes, schedules, and profile details later.
        </p>
        <div className="auth-feature-list">
          <div className="auth-feature-item"><strong>Personalized</strong><span>Add an optional avatar and shape the workspace around your semester.</span></div>
          <div className="auth-feature-item"><strong>Practical</strong><span>Designed for readable forms, good contrast, and strong mobile usability.</span></div>
          <div className="auth-feature-item"><strong>Ready to grow</strong><span>Tasks, weekly planning, chat, and notes stay connected from the start.</span></div>
        </div>
      </div>

      <div className="auth-card card">
        <div className="auth-header">
          <div className="auth-badge auth-badge-subtle">Create account</div>
          <div className="title auth-title">Start your workspace</div>
          <div className="muted small">Minimal setup — you can change everything later.</div>
        </div>

        <form className="form-grid auth-form" onSubmit={onSubmit}>
          <div className="two-col">
            <label className="auth-label" htmlFor="name">
              <span>Name</span>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </label>

            <label className="auth-label" htmlFor="email">
              <span>Email</span>
              <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
          </div>

          <label className="auth-label" htmlFor="password">
            <span>Password</span>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          <label className="auth-label" htmlFor="language">
            <span>{t("Language")}</span>
            <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="auth-avatar-row">
            <div className="avatar auth-avatar-preview">
              {avatarPreview ? <img src={avatarPreview} alt="Selected avatar preview" /> : <span className="small">🙂</span>}
            </div>

            <div className="auth-avatar-copy">
              <input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
                className="sr-only"
              />
              <label htmlFor="avatar" className="btn btn-ghost auth-avatar-button">
                Choose avatar
              </label>
              <div className="small muted">PNG or JPG under 1MB.</div>
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
