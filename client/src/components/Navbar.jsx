import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ChatWidget from "./ChatWidget";

const linkStyle = ({ isActive }) => ({
  padding: "8px 10px",
  borderRadius: 8,
  textDecoration: "none",
  color: "black",
  background: isActive ? "#eaeaea" : "transparent",
});

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <>
    <div style={{ borderBottom: "1px solid #ddd", padding: 12 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/" style={{ fontWeight: 800, textDecoration: "none", color: "black" }}>
          Study Planner
        </Link>

        <div style={{ display: "flex", gap: 8 }}>
          <NavLink to="/" style={linkStyle} end>Dashboard</NavLink>
          <NavLink to="/courses" style={linkStyle}>Courses</NavLink>
          <NavLink to="/tasks" style={linkStyle}>Tasks</NavLink>
          <NavLink to="/week" style={linkStyle}>Weekly</NavLink>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, color: "#444" }}>{user?.email}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
    </div>
    <ChatWidget />
    </>
  );
}
