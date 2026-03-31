import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Feature({ title, text, icon }) {
  return (
    <div className="landing-feature card">
      <div className="landing-feature-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="landing-feature-title">{title}</div>
      <div className="small muted">{text}</div>
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-shell"><div className="auth-card card">Loading...</div></div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing-shell">
      <div className="landing-backdrop landing-backdrop-a" />
      <div className="landing-backdrop landing-backdrop-b" />
      <div className="landing-container">
        <section className="landing-hero">
          <div className="landing-badge">Smart student workspace</div>
          <h1 className="landing-title">Organize your semester, notes, tasks, and friends in one beautiful place.</h1>
          <p className="landing-subtitle">
            Plan courses, track exams, manage daily work, write AI-assisted notes, and stay connected with your study circle.
          </p>

          <div className="landing-actions">
            <Link to="/login" className="btn btn-primary landing-action-btn">
              Login
            </Link>
            <Link to="/register" className="btn btn-ghost landing-action-btn">
              Register
            </Link>
          </div>

          <div className="landing-stats">
            <div className="landing-stat card">
              <strong>Courses</strong>
              <span className="small muted">Track classes, exams, and schedules</span>
            </div>
            <div className="landing-stat card">
              <strong>Notes</strong>
              <span className="small muted">Write and organize your study material</span>
            </div>
            <div className="landing-stat card">
              <strong>Friends</strong>
              <span className="small muted">Chat and collaborate without leaving the app</span>
            </div>
          </div>
        </section>

        <section className="landing-showcase card">
          <div className="landing-showcase-head">
            <div>
              <div className="title">Everything in one dashboard</div>
              <div className="muted small">Built for students who want calm structure and fast daily flow.</div>
            </div>
            <div className="landing-mini-pill">PostgreSQL · Node · Express · React</div>
          </div>

          <div className="landing-feature-grid">
            <Feature
              icon="📅"
              title="Calendar clarity"
              text="Stay ahead of midterms, finals, tasks, and daily plans with less switching between pages."
            />
            <Feature
              icon="📝"
              title="Focused note editor"
              text="Capture ideas, study materials, and AI suggestions in a clean workspace designed for long sessions."
            />
            <Feature
              icon="💬"
              title="Built-in chat"
              text="Collaborate with friends, edit messages smoothly, and keep communication close to your coursework."
            />
            <Feature
              icon="🌙"
              title="Polished dark mode"
              text="Enjoy a modern visual system made for daytime and late-night study without harsh contrast."
            />
          </div>

          <div className="landing-bottom-cta">
            <div>
              <div className="landing-bottom-title">Ready to start?</div>
              <div className="small muted">Create an account or log in to open your workspace.</div>
            </div>
            <div className="landing-actions">
              <Link to="/register" className="btn btn-primary">
                Create account
              </Link>
              <Link to="/login" className="btn">
                Open login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
