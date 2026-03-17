import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { apiDeleteMe, apiUpdateMe } from "../api/users.api";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { user, logout, updateSession } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setAvatarUrl(user?.avatar_url || null);
  }, [user]);

  const avatarPreview = useMemo(() => avatarUrl, [avatarUrl]);

  async function onPickAvatar(file) {
    setError("");
    setStatus("");
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

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");

    try {
      const data = await apiUpdateMe({
        name,
        email,
        avatarUrl: avatarUrl || null,
      });
      updateSession(data);
      setStatus("Saved.");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteAccount() {
    setError("");
    setStatus("");

    const ok = window.confirm(
      "Delete your account permanently? This will remove all your data (tasks, courses, schedules). This cannot be undone.",
    );
    if (!ok) return;

    try {
      await apiDeleteMe();
      logout();
      nav("/register", { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to delete account",
      );
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="page-title">
          <div>
            <div className="title">Account Settings</div>
            <div className="muted small">
              Update your profile, email, and avatar — or delete your account.
            </div>
          </div>
        </div>

        <div className="card">
          <form className="form-grid" onSubmit={onSave}>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div className="avatar" style={{ width: 64, height: 64 }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" />
                ) : (
                  <span className="small">🙂</span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 260 }}>
                <div className="two-col">
                  <label>
                    Name
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                </div>

                <label style={{ marginTop: 8 }}>
                  Avatar
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
                    }}
                  >
                    Choose file
                  </label>
                </label>

                <div className="row" style={{ marginTop: 10 }}>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    disabled={saving || !avatarUrl}
                    title="Remove avatar"
                  >
                    Remove avatar
                  </button>
                </div>

                {status && <div className="small muted">{status}</div>}
                {error && (
                  <div className="small" style={{ color: "var(--danger)" }}>
                    {error}
                  </div>
                )}
              </div>
            </div>

            <hr />

            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 650 }}>Danger zone</div>
                <div className="small muted">This action is permanent.</div>
              </div>
              <button
                className="btn btn-danger"
                type="button"
                onClick={onDeleteAccount}
              >
                Delete account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
