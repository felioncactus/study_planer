import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { apiListCalendarEvents } from "../api/calendar.api";
import { apiListCourses } from "../api/courses.api";
import { apiListTasks } from "../api/tasks.api";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYmd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sameYmd(a, b) {
  return toYmd(new Date(a)) === toYmd(new Date(b));
}

function formatHumanDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function formatClock(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function minutesOfDay(value) {
  const d = new Date(value);
  return d.getHours() * 60 + d.getMinutes();
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function isAllDayLike(event) {
  if (event.allDay) return true;
  if (!event.start || !event.end) return true;
  return String(event.start).length <= 10 || String(event.end).length <= 10;
}

function hexToRgba(hex, alpha) {
  const value = String(hex || "").replace("#", "").trim();
  const normalized = value.length === 3
    ? value.split("").map((c) => c + c).join("")
    : value;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(99, 102, 241, ${alpha})`;
  const num = parseInt(normalized, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getEventStyle(event, courseMap, taskMap) {
  const task = event.meta?.taskId ? taskMap.get(event.meta.taskId) : null;
  const courseId = event.meta?.courseId ?? task?.course_id ?? null;
  const course = courseId ? courseMap.get(courseId) : null;
  const courseColor = course?.color || event.meta?.color || null;

  if (event.type === "course") {
    return {
      label: "Course",
      accent: courseColor || "#2563eb",
      background: hexToRgba(courseColor || "#2563eb", 0.16),
      border: hexToRgba(courseColor || "#2563eb", 0.35),
    };
  }

  if (event.type === "task") {
    return {
      label: "Task due",
      accent: courseColor || "#8b5cf6",
      background: hexToRgba(courseColor || "#8b5cf6", 0.15),
      border: hexToRgba(courseColor || "#8b5cf6", 0.35),
    };
  }

  if (event.type === "exam") {
    return {
      label: "Exam",
      accent: courseColor || "#f59e0b",
      background: hexToRgba(courseColor || "#f59e0b", 0.16),
      border: hexToRgba(courseColor || "#f59e0b", 0.35),
    };
  }

  if (event.meta?.blockType === "activity") {
    return {
      label: "Activity",
      accent: "#10b981",
      background: "rgba(16, 185, 129, 0.15)",
      border: "rgba(16, 185, 129, 0.35)",
    };
  }

  if (event.meta?.blockType === "task") {
    return {
      label: "Task block",
      accent: courseColor || "#8b5cf6",
      background: hexToRgba(courseColor || "#8b5cf6", 0.17),
      border: hexToRgba(courseColor || "#8b5cf6", 0.35),
    };
  }

  return {
    label: "Other",
    accent: "#64748b",
    background: "rgba(100, 116, 139, 0.14)",
    border: "rgba(100, 116, 139, 0.3)",
  };
}

function buildTimedLayouts(events) {
  const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
  const columnsEnd = [];
  const laidOut = [];

  for (const event of sorted) {
    const start = minutesOfDay(event.start);
    const end = Math.max(start + 30, minutesOfDay(event.end));

    let placedColumn = 0;
    while (placedColumn < columnsEnd.length && columnsEnd[placedColumn] > start) {
      placedColumn += 1;
    }
    columnsEnd[placedColumn] = end;

    laidOut.push({
      ...event,
      _startMin: start,
      _endMin: end,
      _column: placedColumn,
    });
  }

  return laidOut.map((event) => {
    const overlapColumns = laidOut
      .filter((other) => other.id !== event.id && other._startMin < event._endMin && other._endMin > event._startMin)
      .reduce((max, other) => Math.max(max, other._column + 1), event._column + 1);

    return {
      ...event,
      _columns: overlapColumns,
    };
  });
}

export default function Weekly() {
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const ymd = useMemo(() => toYmd(anchor), [anchor]);

  const courseMap = useMemo(() => {
    const map = new Map();
    for (const course of courses) map.set(course.id, course);
    return map;
  }, [courses]);

  const taskMap = useMemo(() => {
    const map = new Map();
    for (const task of tasks) map.set(task.id, task);
    return map;
  }, [tasks]);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      setError("");
      setLoading(true);
      try {
        const [calendarData, coursesData, tasksData] = await Promise.all([
          apiListCalendarEvents({ start: ymd, end: ymd }),
          apiListCourses(),
          apiListTasks(),
        ]);

        if (!alive) return;
        setEvents(calendarData.events || []);
        setCourses(coursesData.courses || []);
        setTasks(tasksData.tasks || []);
      } catch (err) {
        if (!alive) return;
        setError(err?.response?.data?.error?.message || "Failed to load daily timetable");
      } finally {
        if (alive) setLoading(false);
      }
    }

    refresh();
    return () => {
      alive = false;
    };
  }, [ymd]);

  const allDayEvents = useMemo(
    () => events.filter((event) => isAllDayLike(event)),
    [events]
  );

  const timedEvents = useMemo(
    () => buildTimedLayouts(events.filter((event) => !isAllDayLike(event))),
    [events]
  );

  const hours = useMemo(() => Array.from({ length: 18 }, (_, i) => i + 6), []);

  const summary = useMemo(() => {
    const counts = { course: 0, activity: 0, task: 0, other: 0 };
    for (const event of events) {
      if (event.type === "course") counts.course += 1;
      else if (event.type === "task" || event.meta?.blockType === "task") counts.task += 1;
      else if (event.meta?.blockType === "activity") counts.activity += 1;
      else counts.other += 1;
    }
    return counts;
  }, [events]);

  function prevDay() {
    setAnchor((current) => addDays(current, -1));
  }

  function nextDay() {
    setAnchor((current) => addDays(current, 1));
  }

  const isToday = sameYmd(anchor, new Date());

  return (
    <>
      <Navbar />
      <div className="container" style={{ marginTop: 20, marginBottom: 28 }}>
        <div
          className="card"
          style={{
            padding: 20,
            borderRadius: 24,
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.10), rgba(139,92,246,0.08), rgba(16,185,129,0.08))",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <div className="small muted" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
                Daily planner
              </div>
              <h2 style={{ margin: 0 }}>Daily timetable</h2>
              <div className="small muted">
                {formatHumanDate(anchor)} {isToday ? "• Today" : ""}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn btn-ghost" onClick={prevDay}>◀ Prev day</button>
              <button className="btn" onClick={() => setAnchor(startOfDay(new Date()))}>Today</button>
              <button className="btn btn-ghost" onClick={nextDay}>Next day ▶</button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              marginTop: 18,
            }}
          >
            {[
              { title: "Courses", value: summary.course },
              { title: "Tasks", value: summary.task },
              { title: "Activities", value: summary.activity },
              { title: "Other", value: summary.other },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  borderRadius: 18,
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.62)",
                  border: "1px solid rgba(148,163,184,0.18)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div className="small muted">{item.title}</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 280px) minmax(0, 1fr)",
            gap: 16,
            marginTop: 16,
          }}
        >
          <div style={{ display: "grid", gap: 16, alignSelf: "start" }}>
            <div className="card" style={{ padding: 18, borderRadius: 22 }}>
              <h3 style={{ marginTop: 0 }}>Legend</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { label: "Course", color: "#2563eb" },
                  { label: "Task", color: "#8b5cf6" },
                  { label: "Activity", color: "#10b981" },
                  { label: "Exam", color: "#f59e0b" },
                  { label: "Other", color: "#64748b" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: item.color,
                        boxShadow: `0 0 0 6px ${hexToRgba(item.color, 0.18)}`,
                      }}
                    />
                    <span className="small">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 18, borderRadius: 22 }}>
              <h3 style={{ marginTop: 0 }}>All-day items</h3>
              {loading ? (
                <div className="small muted">Loading…</div>
              ) : allDayEvents.length === 0 ? (
                <div className="small muted">No all-day deadlines or exams for this day.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {allDayEvents.map((event) => {
                    const style = getEventStyle(event, courseMap, taskMap);
                    return (
                      <div
                        key={event.id}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 16,
                          background: style.background,
                          border: `1px solid ${style.border}`,
                          borderLeft: `5px solid ${style.accent}`,
                        }}
                      >
                        <div className="small muted">{style.label}</div>
                        <div style={{ fontWeight: 700, marginTop: 4 }}>{event.title}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: 24 }}>
            <div
              style={{
                position: "relative",
                minHeight: 18 * 76,
                background:
                  "linear-gradient(180deg, rgba(248,250,252,0.95), rgba(255,255,255,0.98))",
              }}
            >
              {hours.map((hour, index) => (
                <div
                  key={hour}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: index * 76,
                    height: 76,
                    borderTop: "1px solid rgba(226,232,240,0.9)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 18,
                      top: -10,
                      padding: "0 8px",
                      fontSize: 12,
                      color: "#64748b",
                      background: "rgba(255,255,255,0.95)",
                    }}
                  >
                    {`${pad2(hour)}:00`}
                  </div>
                </div>
              ))}

              <div style={{ position: "absolute", inset: 0, padding: "0 18px 0 84px" }}>
                {timedEvents.length === 0 && !loading ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 24,
                      borderRadius: 22,
                      border: "1px dashed rgba(148,163,184,0.5)",
                      display: "grid",
                      placeItems: "center",
                      color: "#64748b",
                      background: "rgba(248,250,252,0.72)",
                    }}
                  >
                    Nothing scheduled for this day yet.
                  </div>
                ) : null}

                {timedEvents.map((event) => {
                  const style = getEventStyle(event, courseMap, taskMap);
                  const totalMinutes = 18 * 60;
                  const top = ((event._startMin - 6 * 60) / totalMinutes) * (18 * 76);
                  const height = Math.max(((event._endMin - event._startMin) / totalMinutes) * (18 * 76), 42);
                  const width = `calc(${100 / event._columns}% - 8px)`;
                  const left = `calc(${(100 / event._columns) * event._column}% + 4px)`;

                  return (
                    <div
                      key={event.id}
                      title={`${event.title} • ${formatClock(event.start)} – ${formatClock(event.end)}`}
                      style={{
                        position: "absolute",
                        top: clamp(top, 0, 18 * 76 - 42),
                        left,
                        width,
                        height,
                        minHeight: 42,
                        borderRadius: 18,
                        padding: "12px 12px 10px",
                        overflow: "hidden",
                        background: style.background,
                        border: `1px solid ${style.border}`,
                        borderLeft: `5px solid ${style.accent}`,
                        boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <div className="small muted">{style.label}</div>
                      <div style={{ fontWeight: 800, marginTop: 2, lineHeight: 1.25 }}>{event.title}</div>
                      <div className="small muted" style={{ marginTop: 6 }}>
                        {formatClock(event.start)} – {formatClock(event.end)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
