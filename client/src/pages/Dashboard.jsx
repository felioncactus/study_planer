import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { apiTaskSummary, apiListTasks } from "../api/tasks.api";
import { apiListCourses } from "../api/courses.api";

function toYmd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtTime(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function StatCard({ label, value, hint }) {
  return (
    <div className="card stat lift col-3">
      <div className="stat-top">
        <div className="stat-label">{label}</div>
        {hint ? (
          <div className="kpi">
            <span className="kpi-dot" />
            {hint}
          </div>
        ) : null}
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [courses, setCourses] = useState([]);
  const [weekTasks, setWeekTasks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      try {
        const [s, c] = await Promise.all([apiTaskSummary(), apiListCourses()]);
        if (cancelled) return;

        setSummary(s.summary);
        setCourses(c.courses || []);

        // fetch tasks due this week for preview list
        const start = startOfWeekMonday(new Date());
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        const t = await apiListTasks({ from: toYmd(start), to: toYmd(end) });
        if (cancelled) return;

        setWeekTasks((t.tasks || []).filter((x) => x.status !== "done"));
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.error?.message || "Failed to load dashboard");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const topCourses = useMemo(() => courses.slice(0, 6), [courses]);

  return (
    <>
      <Navbar />
      <div className="container bg-texture reveal">
        <div className="page-header">
          <div>
            <div className="title">Dashboard</div>
            <div className="muted small">
              Logged in as <b>{user?.email}</b>
            </div>
          </div>

          <div className="row">
            <Link className="btn btn-ghost" to="/week">
              Weekly
            </Link>
            <Link className="btn btn-primary" to="/tasks">
              Quick Add
            </Link>
          </div>
        </div>

        {error ? (
          <div className="card" style={{ borderColor: "rgba(255,77,79,.35)" }}>
            <div style={{ color: "var(--danger)" }}>{error}</div>
          </div>
        ) : null}

        {/* Overview */}
        <div className="grid-12" style={{ marginTop: 12 }}>
          <StatCard label="Overdue" value={summary ? summary.overdue : "…"} hint="past due" />
          <StatCard label="Due today" value={summary ? summary.due_today : "…"} hint="today" />
          <StatCard label="Due this week" value={summary ? summary.due_this_week : "…"} hint="Mon–Sun" />
          <StatCard label="Open tasks" value={summary ? summary.open_total : "…"} hint="not done" />
        </div>

        <div className="section">
          <div className="section-head">
            <div>
              <h2 className="section-title">Up next</h2>
              <div className="section-sub">Tasks due this week (not done)</div>
            </div>

            <div className="chips">
              <span className="chip">This week</span>
              <span className="chip">Priority</span>
            </div>
          </div>

          <div className="grid-12">
            {/* Left: upcoming tasks */}
            <div className="card lift col-8 accent-edge">
              {weekTasks.length === 0 ? (
                <div className="empty">
                  <div className="empty-title">Nothing due this week 🎉</div>
                  <div className="empty-sub">
                    Add a task (or set due dates) so your dashboard stays helpful.
                  </div>
                  <div className="row">
                    <Link className="btn btn-primary" to="/tasks">
                      Add task
                    </Link>
                    <Link className="btn btn-ghost" to="/courses">
                      Manage courses
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="list">
                  {weekTasks.slice(0, 6).map((t) => (
                    <div key={t.id} className="row-item lift">
                      <div className="row-left">
                        <div className="row-title">{t.title}</div>
                        <div className="row-meta">
                          {t.due_date ? `Due ${t.due_date}` : "No due date"}{" "}
                          {t.status ? `• ${t.status}` : ""}
                        </div>
                      </div>
                      <Link className="btn btn-ghost" to="/tasks">
                        Open
                      </Link>
                    </div>
                  ))}
                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <Link to="/tasks" className="btn btn-ghost">
                      Go to Tasks →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Right: courses */}
            <div className="card lift col-4">
              <div className="section-sub">Your courses</div>

              {topCourses.length === 0 ? (
                <div className="empty" style={{ marginTop: 10 }}>
                  <div className="empty-title">No courses yet</div>
                  <div className="empty-sub">Create a course to start organizing tasks and schedules.</div>
                  <Link className="btn btn-primary" to="/courses">
                    Create course
                  </Link>
                </div>
              ) : (
                <div className="list" style={{ marginTop: 10 }}>
                  {topCourses.map((c) => (
                    <Link
                      key={c.id}
                      to={`/courses/${c.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div className="row-item lift">
                        <div className="row-left" style={{ minWidth: 0 }}>
                          <div className="row-title" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                background: c.color || "rgba(124,124,255,.55)",
                                flex: "0 0 auto",
                              }}
                            />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {c.name}
                            </span>
                          </div>
                          <div className="row-meta">
                            {c.day_of_week ? `${c.day_of_week}` : "No day"}{" "}
                            {c.start_time || c.end_time
                              ? `• ${fmtTime(c.start_time)}${c.start_time && c.end_time ? "–" : ""}${fmtTime(c.end_time)}`
                              : ""}
                          </div>
                        </div>
                        <span className="muted small">→</span>
                      </div>
                    </Link>
                  ))}

                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <Link to="/courses" className="btn btn-ghost">
                      Manage →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="section">
          <div className="section-head">
            <h2 className="section-title">Quick actions</h2>
            <div className="section-sub">Common stuff you’ll do a lot</div>
          </div>

          <div className="grid-12">
            <div className="card lift col-4">
              <div className="row-title">Create courses</div>
              <div className="row-meta">Set days/times, add a color, optional banner</div>
              <div style={{ marginTop: 10 }}>
                <Link className="btn btn-primary" to="/courses">
                  Go to Courses
                </Link>
              </div>
            </div>

            <div className="card lift col-4">
              <div className="row-title">Add tasks</div>
              <div className="row-meta">Due date + status makes your dashboard useful</div>
              <div style={{ marginTop: 10 }}>
                <Link className="btn btn-primary" to="/tasks">
                  Go to Tasks
                </Link>
              </div>
            </div>

            <div className="card lift col-4">
              <div className="row-title">Weekly plan</div>
              <div className="row-meta">See the week and plan study blocks</div>
              <div style={{ marginTop: 10 }}>
                <Link className="btn btn-primary" to="/week">
                  Open Weekly
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
