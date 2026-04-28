import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { apiTaskSummary, apiListTasks } from "../api/tasks.api";
import { apiListCourses } from "../api/courses.api";
import { apiListCalendarEvents } from "../api/calendar.api";
import CalendarWidget, { calendarVisibleRange } from "../components/CalendarWidget";

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

function StatCard({ label, value, hint, to = "/tasks" }) {
  const displayValue = value ?? "...";
  return (
    <Link className="card stat lift col-3 dashboard-stat-card" to={to}>
      <div className="stat-top">
        <div className="stat-label">{label}</div>
        {hint ? (
          <div className="kpi">
            <span className="kpi-dot" />
            {hint}
          </div>
        ) : null}
      </div>
      <div className="stat-value">{displayValue}</div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [courses, setCourses] = useState([]);
  const [weekTasks, setWeekTasks] = useState([]);
  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [mobilePanel, setMobilePanel] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      const { gridStart, gridEnd } = calendarVisibleRange(new Date());
      const start = startOfWeekMonday(new Date());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      const [summaryResult, coursesResult, calendarResult, tasksResult] = await Promise.allSettled([
        apiTaskSummary(),
        apiListCourses(),
        apiListCalendarEvents({ start: toYmd(gridStart), end: toYmd(gridEnd) }),
        apiListTasks({ from: toYmd(start), to: toYmd(end) }),
      ]);

      if (cancelled) return;

      if (summaryResult.status === "fulfilled") {
        const nextSummary = summaryResult.value.summary || {};
        setSummary({
          overdue: nextSummary.overdue ?? 0,
          due_today: nextSummary.due_today ?? 0,
          due_this_week: nextSummary.due_this_week ?? 0,
          open_total: nextSummary.open_total ?? 0,
        });
      } else {
        setSummary({ overdue: 0, due_today: 0, due_this_week: 0, open_total: 0 });
      }

      if (coursesResult.status === "fulfilled") {
        setCourses(coursesResult.value.courses || []);
      }

      if (calendarResult.status === "fulfilled") {
        setCalendarEvents(calendarResult.value.events || []);
      }
      setCalendarLoading(false);

      if (tasksResult.status === "fulfilled") {
        setWeekTasks((tasksResult.value.tasks || []).filter((x) => x.status !== "done"));
      }

      const failed = [summaryResult, coursesResult, calendarResult, tasksResult].find((result) => result.status === "rejected");
      if (failed) {
        setError(failed.reason?.response?.data?.error?.message || "Some dashboard data could not be loaded");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;

    async function loadCalendar() {
      setCalendarLoading(true);
      try {
        const { gridStart, gridEnd } = calendarVisibleRange(calendarAnchor);
        const cal = await apiListCalendarEvents({ start: toYmd(gridStart), end: toYmd(gridEnd) });
        if (cancelled) return;
        setCalendarEvents(cal.events || []);
      } catch (err) {
        // non-fatal; dashboard still works
      } finally {
        if (!cancelled) setCalendarLoading(false);
      }
    }

    loadCalendar();
    return () => {
      cancelled = true;
    };
  }, [calendarAnchor]);


  const topCourses = useMemo(() => courses.slice(0, 6), [courses]);

  function prevMonth() {
    const d = new Date(calendarAnchor);
    d.setMonth(d.getMonth() - 1);
    setCalendarAnchor(d);
  }

  function nextMonth() {
    const d = new Date(calendarAnchor);
    d.setMonth(d.getMonth() + 1);
    setCalendarAnchor(d);
  }

  return (
    <>
      <Navbar />
      <div className="container bg-texture reveal dashboard-shell">
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
        <div className="grid-12 dashboard-stat-grid" style={{ marginTop: 12 }}>
          <StatCard label="Overdue" value={summary ? summary.overdue : "…"} hint="past due" />
          <StatCard label="Due today" value={summary ? summary.due_today : "…"} hint="today" />
          <StatCard label="Due this week" value={summary ? summary.due_this_week : "…"} hint="Mon–Sun" />
          <StatCard label="Open tasks" value={summary ? summary.open_total : "…"} hint="not done" />
        </div>

        <div className="section dashboard-up-next">
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

          <div className="dashboard-mobile-tools">
            <button type="button" className="btn btn-ghost" onClick={() => setMobilePanel("courses")}>
              Courses
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setMobilePanel("actions")}>
              Quick actions
            </button>
          </div>

          <div className="grid-12 dashboard-next-grid">
            {/* Left: upcoming tasks */}
            <div className="card lift col-8 accent-edge dashboard-upcoming-card">
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
            <div className="card lift col-4 dashboard-courses-card">
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
                              ? `- ${fmtTime(c.start_time)}${c.start_time && c.end_time ? "-" : ""}${fmtTime(c.end_time)}`
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
        <div className="section dashboard-quick-actions">
          <div className="section-head">
            <h2 className="section-title">Quick actions</h2>
            <div className="section-sub">Common stuff you’ll do a lot</div>
          </div>

          <div className="grid-12 dashboard-actions-grid">
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
        <div className="section dashboard-schedule">
          <div className="section-head">
            <div>
              <h2 className="section-title">Schedule</h2>
              <div className="section-sub">Courses + tasks in one place</div>
            </div>
          </div>

          <div className="card lift dashboard-calendar-card">
            <CalendarWidget
              anchor={calendarAnchor}
              events={calendarEvents}
              loading={calendarLoading}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
            />
          </div>
        </div>

        {mobilePanel ? (
          <div className="mobile-sheet-backdrop is-open" onClick={() => setMobilePanel("")}>
            <section className="mobile-sheet-card" onClick={(event) => event.stopPropagation()}>
              <div className="mobile-sheet-handle" aria-hidden="true" />
              <div className="mobile-sheet-head">
                <div>
                  <div className="mobile-sheet-title">
                    {mobilePanel === "courses" ? "Your courses" : "Quick actions"}
                  </div>
                  <div className="small muted">
                    {mobilePanel === "courses" ? "Course shortcuts for this workspace." : "Common dashboard actions."}
                  </div>
                </div>
                <button type="button" className="icon-btn" onClick={() => setMobilePanel("")} aria-label="Close">
                  X
                </button>
              </div>

              {mobilePanel === "courses" ? (
                topCourses.length === 0 ? (
                  <div className="empty">
                    <div className="empty-title">No courses yet</div>
                    <div className="empty-sub">Create a course to start organizing tasks and schedules.</div>
                    <Link className="btn btn-primary" to="/courses">Create course</Link>
                  </div>
                ) : (
                  <div className="list">
                    {topCourses.map((c) => (
                      <Link key={c.id} to={`/courses/${c.id}`} className="mobile-sheet-row">
                        <span className="course-dot" style={{ background: c.color || "rgba(124,124,255,.55)" }} />
                        <span>
                          <span className="row-title">{c.name}</span>
                          <span className="row-meta">
                            {c.day_of_week ? `${c.day_of_week}` : "No day"}{" "}
                            {c.start_time || c.end_time
                              ? `• ${fmtTime(c.start_time)}${c.start_time && c.end_time ? "–" : ""}${fmtTime(c.end_time)}`
                              : ""}
                          </span>
                        </span>
                      </Link>
                    ))}
                    <Link to="/courses" className="btn btn-ghost">Manage courses</Link>
                  </div>
                )
              ) : (
                <div className="mobile-sheet-actions">
                  <Link className="btn btn-primary" to="/courses">Go to Courses</Link>
                  <Link className="btn btn-primary" to="/tasks">Go to Tasks</Link>
                  <Link className="btn btn-primary" to="/week">Open Weekly</Link>
                </div>
              )}
            </section>
          </div>
        ) : null}

      </div>
    </>
  );
}
