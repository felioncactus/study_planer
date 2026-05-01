import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
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

function Icon({ name, size = 16 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (name) {
    case "dashboard":
      return <svg {...common}><path d="M4 13h7V4H4Z" /><path d="M13 20h7v-7h-7Z" /><path d="M13 11h7V4h-7Z" /><path d="M4 20h7v-5H4Z" /></svg>;
    case "courses":
      return <svg {...common}><path d="M5 6.5 12 4l7 2.5v11L12 20l-7-2.5Z" /><path d="M12 4v16" /></svg>;
    case "activities":
      return <svg {...common}><path d="M4 12h4l2-5 4 10 2-5h4" /></svg>;
    case "week":
      return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M4 10h16" /></svg>;
    case "friends":
      return <svg {...common}><path d="M8 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M16 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path d="M2.5 19a5 5 0 0 1 10 0" /><path d="M14 19a4 4 0 0 1 7.5-1.5" /></svg>;
    case "chat":
      return <svg {...common}><path d="M5 6.5h14a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H9l-5 3v-3H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z" /></svg>;
    case "stats":
      return <svg {...common}><path d="M5 18V9" /><path d="M12 18V5" /><path d="M19 18v-7" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.54V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.54 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.16.5.65.84 1.18.84H21a2 2 0 1 1 0 4h-.09c-.53 0-1.02.34-1.18.84Z" /></svg>;
    case "sun":
      return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5" /><path d="M12 19.5V22" /><path d="m4.93 4.93 1.77 1.77" /><path d="m17.3 17.3 1.77 1.77" /><path d="M2 12h2.5" /><path d="M19.5 12H22" /><path d="m4.93 19.07 1.77-1.77" /><path d="m17.3 6.7 1.77-1.77" /></svg>;
    case "moon":
      return <svg {...common}><path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6 6 0 0 0 20 14.5Z" /></svg>;
    case "logout":
      return <svg {...common}><path d="M10 17l-5-5 5-5" /><path d="M5 12h10" /><path d="M14 5h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4" /></svg>;
    case "assistant":
      return <svg {...common}><path d="m12 3 1.8 4.7L18.5 9l-4.7 1.3L12 15l-1.8-4.7L5.5 9l4.7-1.3Z" /><path d="M18 16.5 19 19l2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z" /></svg>;
    case "more":
      return <svg {...common}><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>;
    case "close":
      return <svg {...common}><path d="m18 6-12 12" /><path d="m6 6 12 12" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
  }
}

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/courses", label: "Courses", icon: "courses" },
  { to: "/activities", label: "Activities", icon: "activities" },
  { to: "/week", label: "Daily", icon: "week" },
  { to: "/friends", label: "Friends", badge: true, icon: "friends" },
  { to: "/chat", label: "Chat", icon: "chat" },
  { to: "/statistics", label: "Statistics", icon: "stats" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

const MOBILE_PRIMARY_ITEMS = [
  { to: "/dashboard", label: "Home", icon: "dashboard" },
  { to: "/courses", label: "Courses", icon: "courses" },
  { to: "/chat", label: "Chat", icon: "chat" },
  { action: "assistant", label: "Assistant", icon: "assistant" },
  { action: "more", label: "Menu", icon: "more" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { badge: friendBadge } = useNotifications();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreSheetRef = useRef(null);
  const moreDragRef = useRef({ startY: 0, dragging: false });

  useEffect(() => {
    setMoreOpen(false);
  }, [user?.id, location.pathname]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const desktopLinkClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");
  const mobileLinkClass = ({ isActive }) => "mobile-tab-link" + (isActive ? " active" : "");
  const overflowItems = useMemo(
    () => NAV_ITEMS.filter((item) => !MOBILE_PRIMARY_ITEMS.some((mobileItem) => mobileItem.to === item.to)),
    [],
  );

  function toggleAssistant() {
    window.dispatchEvent(new CustomEvent("planёrka:toggle-assistant"));
    setMoreOpen(false);
  }

  function closeMoreMenu() {
    const sheet = moreSheetRef.current;
    if (sheet) {
      sheet.style.setProperty("--sheet-drag-y", "0px");
      sheet.classList.remove("is-dragging");
    }
    setMoreOpen(false);
  }

  function handleMoreTouchStart(event) {
    const touch = event.touches?.[0];
    if (!touch) return;
    moreDragRef.current = { startY: touch.clientY, dragging: true };
    moreSheetRef.current?.classList.add("is-dragging");
  }

  function handleMoreTouchMove(event) {
    if (!moreDragRef.current.dragging) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const deltaY = Math.max(0, touch.clientY - moreDragRef.current.startY);
    moreSheetRef.current?.style.setProperty("--sheet-drag-y", `${deltaY}px`);
  }

  function handleMoreTouchEnd() {
    const sheet = moreSheetRef.current;
    const dragValue = Number.parseFloat(sheet?.style.getPropertyValue("--sheet-drag-y") || "0");
    moreDragRef.current = { startY: 0, dragging: false };
    sheet?.classList.remove("is-dragging");
    sheet?.style.setProperty("--sheet-drag-y", "0px");
    if (dragValue > 72) setMoreOpen(false);
  }

  return (
    <>
      <header className="navbar-wrap">
        <div className="container">
          <div className="navbar">
            <Link to="/dashboard" className="navbar-brand" aria-label="Go to dashboard">
              <div className="navbar-mark" aria-hidden="true">
                <img src="/planorka-logo.png" alt="" className="navbar-logo-img" />
              </div>
              <div className="navbar-brand-copy">
                <span className="navbar-brand-title">PLANЁRKA</span>
                <span className="small muted">Student workspace</span>
              </div>
            </Link>

            <button
              type="button"
              className="btn btn-ghost nav-mobile-more-btn"
              aria-expanded={moreOpen}
              aria-controls="mobile-more-sheet"
              onClick={() => setMoreOpen((value) => !value)}
            >
              <Icon name="more" size={18} />
              <span>Menu</span>
            </button>

            <div className="navbar-main">
              <nav className="nav-links" aria-label="Primary">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.to} to={item.to} className={desktopLinkClass}>
                    <span className="nav-link-icon" aria-hidden="true">
                      <Icon name={item.icon} size={15} />
                    </span>
                    {item.badge ? (
                      <span className="nav-link-with-badge">
                        {item.label}
                        {friendBadge > 0 ? <span className="nav-badge">{friendBadge}</span> : null}
                      </span>
                    ) : (
                      item.label
                    )}
                  </NavLink>
                ))}
              </nav>

              <div className="user-chip">
                <button
                  type="button"
                  className="btn btn-ghost nav-theme-btn"
                  onClick={toggleTheme}
                  aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                  title="Toggle theme"
                >
                  <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
                  <span>{theme === "dark" ? "Light" : "Dark"}</span>
                </button>

                <div className="avatar" title={user?.name || user?.email || ""}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={`${user?.name || "User"} avatar`} />
                  ) : (
                    <span className="small">{initials(user?.name || user?.email)}</span>
                  )}
                </div>

                <div className="user-meta">
                  <span className="small user-name">{user?.name || "Account"}</span>
                  <span className="small muted user-email">{user?.email}</span>
                </div>

                <button type="button" className="btn" onClick={logout}>
                  <Icon name="logout" size={15} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="mobile-tabbar" aria-label="Mobile primary navigation">
        {MOBILE_PRIMARY_ITEMS.map((item) => {
          if (item.action === "more") {
            return (
              <button
                key={item.label}
                type="button"
                className={"mobile-tab-link" + (moreOpen ? " active" : "")}
                onClick={() => setMoreOpen((current) => !current)}
                aria-label="Open menu"
                aria-expanded={moreOpen}
                aria-controls="mobile-more-sheet"
              >
                <span className="mobile-tab-icon" aria-hidden="true"><Icon name={item.icon} size={18} /></span>
                <span>{item.label}</span>
              </button>
            );
          }

          if (item.action === "assistant") {
            return (
              <button
                key={item.label}
                type="button"
                className="mobile-tab-link mobile-tab-link-assistant"
                onClick={toggleAssistant}
                aria-label="Open assistant"
              >
                <span className="mobile-tab-icon" aria-hidden="true"><Icon name={item.icon} size={18} /></span>
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <NavLink key={item.to} to={item.to} className={mobileLinkClass}>
              <span className="mobile-tab-icon" aria-hidden="true">
                <Icon name={item.icon} size={18} />
                {item.to === "/chat" && friendBadge > 0 ? <span className="mobile-tab-badge">{friendBadge}</span> : null}
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div
        className={"mobile-more-backdrop" + (moreOpen ? " is-open" : "")}
        hidden={!moreOpen}
        onClick={() => setMoreOpen(false)}
      />

      <section
        id="mobile-more-sheet"
        ref={moreSheetRef}
        className={"mobile-more-sheet" + (moreOpen ? " is-open" : "")}
        aria-label="More navigation and account actions"
        aria-hidden={!moreOpen}
        onTouchStart={handleMoreTouchStart}
        onTouchMove={handleMoreTouchMove}
        onTouchEnd={handleMoreTouchEnd}
        onTouchCancel={handleMoreTouchEnd}
      >
        <div className="mobile-more-handle" aria-hidden="true" />
        <div className="mobile-more-header">
          <div>
            <div className="mobile-more-title">More</div>
            <div className="small muted">Extra destinations and account actions</div>
          </div>
          <div className="mobile-more-header-actions">
            <div className="avatar mobile-more-avatar" title={user?.name || user?.email || ""}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={`${user?.name || "User"} avatar`} />
              ) : (
                <span className="small">{initials(user?.name || user?.email)}</span>
              )}
            </div>
            <button type="button" className="mobile-more-close" onClick={closeMoreMenu} aria-label="Close menu">
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        <div className="mobile-more-grid">
          {overflowItems.map((item) => (
            <NavLink key={item.to} to={item.to} className="mobile-more-link" onClick={() => setMoreOpen(false)}>
              <span className="mobile-more-link-icon" aria-hidden="true">
                <Icon name={item.icon} size={18} />
              </span>
              <span className="mobile-more-link-copy">
                <span>{item.label}</span>
                {item.badge && friendBadge > 0 ? <span className="mobile-tab-badge mobile-more-badge">{friendBadge}</span> : null}
              </span>
            </NavLink>
          ))}

          <button type="button" className="mobile-more-link" onClick={toggleAssistant}>
            <span className="mobile-more-link-icon" aria-hidden="true"><Icon name="assistant" size={18} /></span>
            <span className="mobile-more-link-copy"><span>Assistant</span><span className="small muted">Open study helper</span></span>
          </button>

          <button type="button" className="mobile-more-link" onClick={() => { toggleTheme(); setMoreOpen(false); }}>
            <span className="mobile-more-link-icon" aria-hidden="true"><Icon name={theme === "dark" ? "sun" : "moon"} size={18} /></span>
            <span className="mobile-more-link-copy"><span>{theme === "dark" ? "Light theme" : "Dark theme"}</span><span className="small muted">Switch appearance</span></span>
          </button>

          <button type="button" className="mobile-more-link mobile-more-link-danger" onClick={logout}>
            <span className="mobile-more-link-icon" aria-hidden="true"><Icon name="logout" size={18} /></span>
            <span className="mobile-more-link-copy"><span>Logout</span><span className="small muted">{user?.email}</span></span>
          </button>
        </div>
      </section>

      <ChatWidget />
    </>
  );
}
