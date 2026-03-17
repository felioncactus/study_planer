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
      setError(
        err?.response?.data?.message || err.message || "Registration failed",
      );
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
              Create account
            </div>
            <div className="muted small" style={{ color: "#666" }}>
              Minimal setup — you can change everything later.
            </div>
          </div>

          <form className="form-grid" onSubmit={onSubmit} style={{ gap: 16 }}>
            <div className="two-col">
              <label style={{ fontWeight: 500, color: "#333" }}>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  style={{
                    padding: "12px 16px",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    fontSize: 16,
                  }}
                />
              </label>

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
            </div>

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

            <div className="row">
              <div className="avatar" style={{ width: 44, height: 44 }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="preview" />
                ) : (
                  <span className="small">🙂</span>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 500, color: "#333" }}>
                  Avatar (optional)
                  <input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                  />
                  <label
                    htmlFor="avatar"
                    className="btn btn-ghost"
                    style={{
                      display: "inline-block",
                      padding: "8px 16px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      backgroundColor: "#f9f9f9",
                      cursor: "pointer",
                      marginTop: 4,
                    }}
                  >
                    Choose file
                  </label>
                </label>
                <div className="muted small" style={{ marginTop: 6 }}>
                  Tip: small square images look best.
                </div>
              </div>

              {avatarUrl && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setAvatarUrl(null)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: "#f9f9f9",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              )}
            </div>

            {error && (
              <div
                className="small"
                style={{ color: "var(--danger)", marginTop: 2 }}
              >
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
              Create account
            </button>

            <div
              className="small muted"
              style={{ textAlign: "center", marginTop: 16 }}
            >
              Already have an account?{" "}
              <Link
                to="/login"
                style={{
                  color: "#667eea",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
