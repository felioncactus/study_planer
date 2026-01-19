import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function randomEmail() {
  return `user${Math.floor(Math.random() * 10000)}@example.com`;
}

export default function Register() {
  const { register } = useAuth();
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

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      await register({ name, email, password, avatarUrl });
      nav("/", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Registration failed");
    }
  }

  return (
    <div className="container" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <div className="card" style={{ width: "min(520px, 100%)" }}>
        <div className="page-title">
          <div>
            <div className="title">Create account</div>
            <div className="muted small">Minimal setup — you can change everything later.</div>
          </div>
          <Link className="small" to="/login">
            Login
          </Link>
        </div>

        <form className="form-grid" onSubmit={onSubmit}>
          <div className="two-col">
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </label>

            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
          </div>

          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          <div className="row">
            <div className="avatar" style={{ width: 44, height: 44 }}>
              {avatarPreview ? <img src={avatarPreview} alt="preview" /> : <span className="small">🙂</span>}
            </div>

            <div style={{ flex: 1 }}>
              <label>
                Avatar (optional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
                />
              </label>
              <div className="muted small" style={{ marginTop: 6 }}>
                Tip: small square images look best.
              </div>
            </div>

            {avatarUrl && (
              <button type="button" className="btn btn-ghost" onClick={() => setAvatarUrl(null)}>
                Remove
              </button>
            )}
          </div>

          {error && (
            <div className="small" style={{ color: "var(--danger)", marginTop: 2 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit">
            Create account
          </button>

          <div className="small muted">
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
