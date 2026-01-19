import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ChatWidget from "./ChatWidget";

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "?";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const linkClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

  return (
    <>
      <div className="navbar-wrap">
        <div className="container">
          <div className="navbar">
            <div className="nav-links">
              <NavLink to="/" className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/courses" className={linkClass}>
                Courses
              </NavLink>
              <NavLink to="/tasks" className={linkClass}>
                Tasks
              </NavLink>
              <NavLink to="/week" className={linkClass}>
                Weekly
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
