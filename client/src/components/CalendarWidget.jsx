import React, { useMemo, useState } from "react";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYmd(date) {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeekSunday(d) {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function monthLabel(date) {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function eventDayKey(ev) {
  const s = String(ev.start || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s.slice(0, 10);
}

function eventTimeLabel(ev) {
  if (ev.allDay) return "All day";
  const s = String(ev.start || "");
  const e = String(ev.end || "");
  const sh = s.includes("T") ? s.slice(11, 16) : "";
  const eh = e.includes("T") ? e.slice(11, 16) : "";
  if (sh && eh) return `${sh}–${eh}`;
  if (sh) return sh;
  return "";
}

function shortType(ev) {
  if (ev.type === "task") return "Task";
  if (ev.type === "course") return "Course";
  if (ev.type === "exam") return "Exam";
  if (ev.type === "block") return "Block";
  return "Event";
}

export function calendarVisibleRange(anchor) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const gridStart = startOfWeekMonday(first);
  const gridEnd = endOfWeekSunday(last);
  return { gridStart, gridEnd };
}

export default function CalendarWidget({ anchor, events, loading, onPrevMonth, onNextMonth }) {
  const [selected, setSelected] = useState(() => toYmd(new Date()));

  const { gridStart } = useMemo(() => calendarVisibleRange(anchor), [anchor]);

  const days = useMemo(() => {
    const out = [];
    const d = new Date(gridStart);
    for (let i = 0; i < 42; i++) {
      out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [gridStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of events || []) {
      const key = eventDayKey(ev);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    for (const list of map.values()) {
      list.sort((a, b) => String(a.start).localeCompare(String(b.start)));
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDay.get(selected) || [];

  function isToday(d) {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  return (
    <div className="calendar-shell">
      <div className="calendar-head">
        <div className="calendar-title">
          <div className="section-title" style={{ margin: 0 }}>Calendar</div>
          <div className="muted small">{monthLabel(anchor)}</div>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost" onClick={onPrevMonth} type="button">◀</button>
          <button className="btn btn-ghost" onClick={onNextMonth} type="button">▶</button>
        </div>
      </div>

      <div className="calendar-grid-wrap">
        <div className="calendar-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
            <div key={w} className="cal-weekday">{w}</div>
          ))}

          {days.map((d) => {
            const key = toYmd(d);
            const inMonth = d.getMonth() === anchor.getMonth();
            const list = eventsByDay.get(key) || [];
            const count = list.length;
            const isSel = key === selected;

            return (
              <button
                key={key}
                type="button"
                className={`cal-cell ${inMonth ? "" : "cal-out"} ${isSel ? "cal-selected" : ""} ${isToday(d) ? "cal-today" : ""}`}
                onClick={() => setSelected(key)}
              >
                <div className="cal-day">
                  <span className="cal-num">{d.getDate()}</span>
                  {count > 0 ? <span className="cal-badge">{count}</span> : null}
                </div>

                <div className="cal-events">
                  {list.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={`cal-event cal-${ev.type}`}
                      title={`${shortType(ev)} • ${ev.title}`}
                      style={{
                        borderLeftColor: ev?.meta?.color || undefined,
                      }}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {count > 3 ? <div className="cal-more muted small">+{count - 3} more</div> : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="cal-side">
          <div className="cal-side-head">
            <div className="section-title" style={{ margin: 0, fontSize: 16 }}>Details</div>
            <div className="muted small">{selected}</div>
          </div>

          {loading ? (
            <div className="muted">Loading…</div>
          ) : selectedEvents.length === 0 ? (
            <div className="muted">No events.</div>
          ) : (
            <div className="cal-side-list">
              {selectedEvents.map((ev) => (
                <div key={ev.id} className={`cal-side-item cal-${ev.type}`}>
                  <div className="cal-side-top">
                    <div className="cal-side-title">{ev.title}</div>
                    <div className="cal-side-time muted small">{eventTimeLabel(ev)}</div>
                  </div>
                  <div className="cal-side-meta muted small">{shortType(ev)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="cal-hint muted small">
        Shows course meetings, task due dates, and scheduled blocks.
      </div>
    </div>
  );
}
