import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ChatWidget from "./ChatWidget";
import { useNotifications } from "../context/NotificationsContext";

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "?";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { badge: friendBadge } = useNotifications();

  const linkClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

  return (
    <>
      <div className="navbar-wrap">
        <div className="container">
          <div className="navbar">
            <div className="nav-links">
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/courses" className={linkClass}>
                Courses
              </NavLink>
              <NavLink to="/activities" className={linkClass}>
                Activities
              </NavLink>
              <NavLink to="/week" className={linkClass}>
                Daily
              </NavLink>
              <NavLink to="/friends" className={linkClass}>
                <span className="nav-link-with-badge">
                  Friends
                  {friendBadge > 0 ? <span className="nav-badge">{friendBadge}</span> : null}
                </span>
              </NavLink>
              <NavLink to="/chat" className={linkClass}>
                Chat
              </NavLink>
              <NavLink to="/statistics" className={linkClass}>
                Statistics
              </NavLink>
              <NavLink to="/settings" className={linkClass}>
                Settings
              </NavLink>
            </div>

            <div className="user-chip">
              <button className="btn btn-ghost" onClick={toggleTheme} title="Toggle theme">
                {theme === "dark" ? "☾" : "☀"}
              </button>

              <div className="avatar" title={user?.name || user?.email || ""}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" />
                ) : (
                  <span className="small">{initials(user?.name || user?.email)}</span>
                )}
              </div>

              <div style={{ display: "grid", lineHeight: 1.1 }}>
                <span className="small" style={{ fontWeight: 650 }}>
                  {user?.name || "Account"}
                </span>
                <span className="small muted">{user?.email}</span>
              </div>

              <button className="btn" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <ChatWidget />
    </>
  );
}
