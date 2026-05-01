import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { apiListCalendarEvents } from "../api/calendar.api";
import { apiListCourses } from "../api/courses.api";
import { apiListTasks } from "../api/tasks.api";
import { parseDateLike } from "../utils/date";
import { useLanguage } from "../context/LanguageContext";

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
  return toYmd(parseDateLike(a)) === toYmd(parseDateLike(b));
}

const LOCALE_BY_LANGUAGE = {
  en: "en-US",
  ru: "ru-RU",
  ko: "ko-KR",
  kk: "kk-KZ",
  uz: "uz-UZ",
};

function formatHumanDate(value, language) {
  return new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language] || undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(parseDateLike(value));
}

function formatClock(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(parseDateLike(value));
}

function compareEventsForList(a, b) {
  const aAllDay = isAllDayLike(a);
  const bAllDay = isAllDayLike(b);
  if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
  if (aAllDay && bAllDay) return String(a.title || "").localeCompare(String(b.title || ""));
  return minutesOfDay(a.start) - minutesOfDay(b.start) || minutesOfDay(a.end) - minutesOfDay(b.end);
}

function minutesOfDay(value) {
  const d = parseDateLike(value);
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
  const normalized = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
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
    return { label: "Course", accent: courseColor || "#2563eb", background: hexToRgba(courseColor || "#2563eb", 0.14), border: hexToRgba(courseColor || "#2563eb", 0.34) };
  }
  if (event.type === "task") {
    return { label: "Task due", accent: courseColor || "#8b5cf6", background: hexToRgba(courseColor || "#8b5cf6", 0.14), border: hexToRgba(courseColor || "#8b5cf6", 0.34) };
  }
  if (event.type === "exam") {
    return { label: "Exam", accent: courseColor || "#f59e0b", background: hexToRgba(courseColor || "#f59e0b", 0.16), border: hexToRgba(courseColor || "#f59e0b", 0.34) };
  }
  if (event.meta?.blockType === "activity") {
    return { label: "Activity", accent: "#10b981", background: "rgba(16, 185, 129, 0.13)", border: "rgba(16, 185, 129, 0.32)" };
  }
  if (event.meta?.blockType === "task") {
    return { label: "Task block", accent: courseColor || "#8b5cf6", background: hexToRgba(courseColor || "#8b5cf6", 0.15), border: hexToRgba(courseColor || "#8b5cf6", 0.34) };
  }
  return { label: "Other", accent: "#64748b", background: "rgba(100, 116, 139, 0.14)", border: "rgba(100, 116, 139, 0.28)" };
}

function buildTimedLayouts(events) {
  const sorted = [...events]
    .map((event) => ({
      ...event,
      _startMin: minutesOfDay(event.start),
      _endMin: Math.max(minutesOfDay(event.end), minutesOfDay(event.start) + 30),
    }))
    .sort((a, b) => a._startMin - b._startMin || a._endMin - b._endMin);

  const groups = [];
  let current = [];
  let groupEnd = -1;

  for (const event of sorted) {
    if (!current.length || event._startMin < groupEnd) {
      current.push(event);
      groupEnd = Math.max(groupEnd, event._endMin);
    } else {
      groups.push(current);
      current = [event];
      groupEnd = event._endMin;
    }
  }
  if (current.length) groups.push(current);

  const laidOut = [];
  for (const group of groups) {
    const laneEnds = [];
    const assigned = [];

    for (const event of group) {
      let lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] > event._startMin) lane += 1;
      laneEnds[lane] = event._endMin;
      assigned.push({ ...event, _column: lane });
    }

    const totalColumns = Math.max(1, laneEnds.length);
    for (const event of assigned) {
      laidOut.push({ ...event, _columns: totalColumns });
    }
  }

  return laidOut;
}

function getNowMarkerPosition(anchor, totalHeight, startHour, endHour) {
  if (!sameYmd(anchor, new Date())) return null;
  const now = new Date();
  const minute = now.getHours() * 60 + now.getMinutes();
  const windowStart = startHour * 60;
  const windowEnd = endHour * 60;
  if (minute < windowStart || minute > windowEnd) return null;
  return ((minute - windowStart) / ((endHour - startHour) * 60)) * totalHeight;
}

export default function Weekly() {
  const { language, t } = useLanguage();
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [timetableOpen, setTimetableOpen] = useState(false);

  const ymd = useMemo(() => toYmd(anchor), [anchor]);
  const courseMap = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

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

  const allDayEvents = useMemo(() => events.filter((event) => isAllDayLike(event)), [events]);
  const timedEvents = useMemo(() => buildTimedLayouts(events.filter((event) => !isAllDayLike(event))), [events]);
  const mobileTimelineEvents = useMemo(
    () => [...events].sort(compareEventsForList),
    [events]
  );

  const startHour = 6;
  const endHour = 24;
  const hourCount = endHour - startHour;
  const hourRowHeight = 88;
  const totalHeight = hourCount * hourRowHeight;
  const hours = useMemo(() => Array.from({ length: hourCount + 1 }, (_, i) => i + startHour), [hourCount, startHour]);
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
  const totalMinutes = useMemo(
    () => timedEvents.reduce((sum, event) => sum + Math.max(0, event._endMin - event._startMin), 0),
    [timedEvents]
  );
  const busyHours = Math.round((totalMinutes / 60) * 10) / 10;
  const nowMarkerTop = getNowMarkerPosition(anchor, totalHeight, startHour, endHour);
  const isToday = sameYmd(anchor, new Date());

  return (
    <>
      <Navbar />
      <div className="container" style={{ marginTop: 20, marginBottom: 28 }}>
        <div className={`daily-shell ${timetableOpen ? "is-timetable-open" : ""}`}>
          <div className="card">
            <div className="page-header" style={{ margin: 0 }}>
              <div>
                <div className="title">Daily</div>
                <div className="small muted">
                  A polished day view with cleaner spacing, stronger dark-mode contrast, and cards that stay inside their lanes.
                </div>
              </div>

              <div className="row">
                <button className="btn btn-ghost" onClick={() => setAnchor((current) => addDays(current, -1))}>← Previous</button>
                <div className="chip">{isToday ? t("Today") : formatHumanDate(anchor, language)}</div>
                <button className="btn btn-primary daily-timetable-open-btn" type="button" onClick={() => setTimetableOpen(true)}>
                  {t("Timetable")}
                </button>
                <button className="btn btn-ghost" onClick={() => setAnchor((current) => addDays(current, 1))}>Next →</button>
              </div>
            </div>
          </div>

          {error ? <div className="notice notice-danger">{error}</div> : null}

          <div className="daily-overview">
            <div className="card lift">
              <div className="section-title">Day summary</div>
              <div className="small muted" style={{ marginTop: 4 }}>
                Quick totals for the selected date.
              </div>

              <div className="daily-summary-grid">
                <div className="daily-summary-card">
                  <div>
                    <div className="daily-summary-label">Courses</div>
                    <div className="small muted">Classes and lessons</div>
                  </div>
                  <div className="daily-summary-value">{summary.course}</div>
                </div>

                <div className="daily-summary-card">
                  <div>
                    <div className="daily-summary-label">Tasks</div>
                    <div className="small muted">Due or scheduled work</div>
                  </div>
                  <div className="daily-summary-value">{summary.task}</div>
                </div>

                <div className="daily-summary-card">
                  <div>
                    <div className="daily-summary-label">Activities</div>
                    <div className="small muted">Habits and personal plans</div>
                  </div>
                  <div className="daily-summary-value">{summary.activity}</div>
                </div>

                <div className="daily-summary-card">
                  <div>
                    <div className="daily-summary-label">Busy hours</div>
                    <div className="small muted">Total timed workload</div>
                  </div>
                  <div className="daily-summary-value">{busyHours}</div>
                </div>
              </div>
            </div>

            <div className="card lift">
              <div className="section-title">All-day items</div>
              {allDayEvents.length === 0 ? (
                <div className="small muted" style={{ marginTop: 12 }}>
                  No all-day items for this date.
                </div>
              ) : (
                <div className="daily-allday-list">
                  {allDayEvents.map((event) => {
                    const style = getEventStyle(event, courseMap, taskMap);
                    return (
                      <div
                        key={event.id}
                        className="daily-allday-card"
                        style={{
                          background: style.background,
                          borderColor: style.border,
                          boxShadow: "none",
                        }}
                      >
                        <div className="small muted">{style.label}</div>
                        <div className="daily-allday-title">{event.title}</div>
                        {event.meta?.beginsOn || event.meta?.endsOn ? (
                          <div className="small muted" style={{ marginTop: 8 }}>
                            {event.meta?.beginsOn || "?"} → {event.meta?.endsOn || "?"}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {timetableOpen ? (
            <>
              <button
                type="button"
                className="daily-timetable-backdrop"
                aria-label="Close timetable"
                onClick={() => setTimetableOpen(false)}
              />
              <div className="daily-timetable-head">
                <div>
                  <div className="section-title">Timetable</div>
                  <div className="small muted">{isToday ? t("Today") : formatHumanDate(anchor, language)}</div>
                </div>
                <button className="btn btn-ghost" type="button" onClick={() => setTimetableOpen(false)}>
                  Close
                </button>
              </div>
            </>
          ) : null}

          <div className="daily-mobile-timeline card lift">
            <div className="section-title">Timetable</div>
            <div className="small muted" style={{ marginTop: 4 }}>
              A simplified schedule view for small screens.
            </div>

            {loading ? (
              <div className="daily-mobile-empty">Loading timetable…</div>
            ) : mobileTimelineEvents.length === 0 ? (
              <div className="daily-mobile-empty">Nothing scheduled for this day yet.</div>
            ) : (
              <div className="daily-mobile-list">
                {mobileTimelineEvents.map((event) => {
                  const style = getEventStyle(event, courseMap, taskMap);
                  const allDay = isAllDayLike(event);
                  return (
                    <div
                      key={event.id}
                      className="daily-mobile-card"
                      style={{ borderColor: style.border, background: style.background }}
                    >
                      <div className="daily-mobile-time">
                        {allDay ? "All day" : formatClock(event.start)}
                      </div>
                      <div className="daily-mobile-card-main">
                        <div className="daily-mobile-topline">
                          <span className="daily-mobile-badge" style={{ color: style.accent }}>{style.label}</span>
                          {!allDay ? (
                            <span className="daily-mobile-duration">
                              {formatClock(event.start)} – {formatClock(event.end)}
                            </span>
                          ) : null}
                        </div>
                        <div className="daily-mobile-title">{event.title}</div>
                        {event.meta?.beginsOn || event.meta?.endsOn ? (
                          <div className="small muted" style={{ marginTop: 6 }}>
                            {event.meta?.beginsOn || "?"} → {event.meta?.endsOn || "?"}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="daily-timeline">
            <div className="daily-timeline-scroll">
              <div className="daily-timeline-grid" style={{ minHeight: totalHeight, height: totalHeight }}>
                <div className="daily-rail" />

                <div className="daily-grid" style={{ minHeight: totalHeight, height: totalHeight }}>
                  {hours.map((hour, index) => (
                    <div
                      key={hour}
                      className="daily-hour"
                      style={{ top: index * hourRowHeight, height: hourRowHeight }}
                    >
                      {hour < endHour ? (
                        <div className="daily-hour-label">{`${pad2(hour)}:00`}</div>
                      ) : null}
                    </div>
                  ))}

                  <div className="daily-events">
                    {timedEvents.length === 0 && !loading ? (
                      <div className="daily-empty">Nothing scheduled for this day yet.</div>
                    ) : null}

                    {nowMarkerTop !== null ? (
                      <div className="daily-now" style={{ top: nowMarkerTop }}>
                        <div className="daily-now-dot" />
                      </div>
                    ) : null}

                    {timedEvents.map((event) => {
                      const style = getEventStyle(event, courseMap, taskMap);
                      const top = ((event._startMin - startHour * 60) / (hourCount * 60)) * totalHeight;
                      const rawHeight = ((event._endMin - event._startMin) / (hourCount * 60)) * totalHeight;
                      const height = Math.max(rawHeight, 64);
                      const horizontalGap = 12;
                      const innerGap = event._columns > 1 ? horizontalGap : 0;
                      const widthPercent = 100 / event._columns;
                      const leftPercent = widthPercent * event._column;
                      const compact = height < 92;

                      return (
                        <div
                          key={event.id}
                          className="daily-event"
                          title={`${event.title} • ${formatClock(event.start)} – ${formatClock(event.end)}`}
                          style={{
                            top: clamp(top, 0, totalHeight - 64),
                            left: `calc(${leftPercent}% + ${innerGap / 2}px)`,
                            width: `calc(${widthPercent}% - ${innerGap}px)`,
                            height,
                            zIndex: event._column + 2,
                          }}
                        >
                          <div
                            className="daily-event-inner"
                            style={{
                              background: style.background,
                              borderColor: style.border,
                              borderLeftColor: style.accent,
                            }}
                          >
                            {!compact ? <div className="daily-event-label">{style.label}</div> : null}
                            <div
                              className="daily-event-title"
                              style={{
                                fontSize: compact ? 14 : 16,
                                whiteSpace: compact ? "nowrap" : "normal",
                                textOverflow: compact ? "ellipsis" : "clip",
                              }}
                            >
                              {event.title}
                            </div>
                            <div className="daily-event-meta">
                              {formatClock(event.start)} – {formatClock(event.end)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
