import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import RoundTimePicker from "./RoundTimePicker";

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toYmd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDate(value) {
  const datePart = String(value || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const date = new Date(`${datePart}T12:00:00`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

function monthLabel(date) {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function buildMonthDays(anchor) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);

  const days = [];
  const cursor = new Date(start);
  for (let index = 0; index < 42; index += 1) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function formatDisplay(value, mode) {
  if (!value) return mode === "datetime" ? "Choose date and time" : "Choose date";
  const datePart = String(value).slice(0, 10);
  const timePart = String(value).includes("T") ? String(value).slice(11, 16) : "";
  return mode === "datetime" && timePart ? `${datePart} ${timePart}` : datePart;
}

export default function MobileDateField({
  label,
  value,
  onChange,
  mode = "date",
  min,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(() => parseDate(value));
  const selectedDate = String(value || "").slice(0, 10);
  const selectedTime = String(value || "").includes("T") ? String(value).slice(11, 16) : "09:00";
  const days = useMemo(() => buildMonthDays(anchor), [anchor]);

  function commitDate(day) {
    const nextDate = toYmd(day);
    if (mode === "datetime") {
      onChange?.(`${nextDate}T${selectedTime || "09:00"}`);
    } else {
      onChange?.(nextDate);
      setOpen(false);
    }
  }

  function commitTime(nextTime) {
    const nextDate = selectedDate || toYmd(anchor);
    onChange?.(`${nextDate}T${nextTime}`);
  }

  return (
    <div className="mobile-date-field">
      {label ? <span className="mobile-date-label">{label}</span> : null}
      <button
        type="button"
        className="mobile-date-trigger"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <span>{formatDisplay(value, mode)}</span>
        <span aria-hidden="true">Cal</span>
      </button>

      <input
        type={mode === "datetime" ? "datetime-local" : "date"}
        value={value || ""}
        min={min}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className="native-date-fallback"
      />

      {open ? createPortal(
        <div className="date-sheet-backdrop" onClick={() => setOpen(false)}>
          <section className="date-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-sheet-handle" aria-hidden="true" />
            <div className="date-sheet-head">
              <div>
                <div className="mobile-sheet-title">{label || "Choose date"}</div>
                <div className="small muted">{formatDisplay(value, mode)}</div>
              </div>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close date picker">
                X
              </button>
            </div>

            <div className="date-sheet-month">
              <button type="button" className="btn btn-ghost" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}>
                Prev
              </button>
              <div className="date-sheet-month-title">{monthLabel(anchor)}</div>
              <button type="button" className="btn btn-ghost" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}>
                Next
              </button>
            </div>

            <div className="date-sheet-weekdays">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="date-sheet-days">
              {days.map((day) => {
                const key = toYmd(day);
                const isSelected = key === selectedDate;
                const isCurrentMonth = day.getMonth() === anchor.getMonth();
                return (
                  <button
                    key={key}
                    type="button"
                    className={`date-sheet-day${isSelected ? " is-selected" : ""}${isCurrentMonth ? "" : " is-muted"}`}
                    onClick={() => commitDate(day)}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            {mode === "datetime" ? (
              <div className="date-sheet-time">
                <RoundTimePicker label="Time" value={selectedTime} onChange={commitTime} />
                <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>
                  Done
                </button>
              </div>
            ) : null}
          </section>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
