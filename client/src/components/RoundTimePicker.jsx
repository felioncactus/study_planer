import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);

function pad2(value) {
  return String(value).padStart(2, "0");
}

function normalizeTime(value) {
  if (!value) return "09:00";
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "09:00";
  const hour = Math.max(0, Math.min(23, Number(match[1]) || 0));
  const minute = Math.max(0, Math.min(59, Number(match[2]) || 0));
  return `${pad2(hour)}:${pad2(minute)}`;
}

function parseTime(value) {
  const normalized = normalizeTime(value);
  const [hourText, minuteText] = normalized.split(":");
  const hour24 = Number(hourText);
  const minute = Number(minuteText);
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const displayHour = hour24 % 12 || 12;
  return { hour24, displayHour, minute, meridiem, normalized };
}

function toTimeValue(displayHour, minute, meridiem) {
  const safeHour = ((Number(displayHour) || 12) - 1 + 12) % 12 + 1;
  const safeMinute = Math.max(0, Math.min(59, Number(minute) || 0));
  const hour24 = meridiem === "PM" ? (safeHour % 12) + 12 : safeHour % 12;
  return `${pad2(hour24)}:${pad2(safeMinute)}`;
}

function minuteOptionsFor(value) {
  const current = Math.max(0, Math.min(59, Number(value) || 0));
  const base = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  if (!base.includes(current)) base.push(current);
  return [...new Set(base)].sort((a, b) => a - b);
}

export default function RoundTimePicker({
  label,
  value,
  onChange,
  disabled = false,
  id,
}) {
  const parsed = useMemo(() => parseTime(value), [value]);
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  const minutes = useMemo(() => minuteOptionsFor(parsed.minute), [parsed.minute]);
  const handAngle = ((parsed.displayHour % 12) / 12) * 360 - 90;
  const clockRadius = compact ? 88 : 112;

  function commit(nextHour, nextMinute = parsed.minute, nextMeridiem = parsed.meridiem) {
    onChange?.(toTimeValue(nextHour, nextMinute, nextMeridiem));
  }

  return (
    <div className={`time-field ${disabled ? "is-disabled" : ""}`}>
      {label ? (
        <label htmlFor={id} className="time-field-label">
          {label}
        </label>
      ) : null}

      <button
        id={id}
        type="button"
        className={`time-field-trigger ${open ? "is-open" : ""}`}
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        aria-expanded={open}
      >
        <span className="time-field-trigger-label">{parsed.normalized}</span>
        <span className="time-field-trigger-icon" aria-hidden="true">
          ◷
        </span>
      </button>

      {open ? createPortal(
        <>
        <button
          type="button"
          className="time-popover-backdrop"
          aria-label="Close time picker"
          onClick={() => setOpen(false)}
        />
        <div className="time-popover">
          <div className="time-popover-head">
            <div>
              <div className="small muted">Selected time</div>
              <div className="time-preview">{parsed.normalized}</div>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>

          <div className="time-toggle-row">
            <button
              type="button"
              className={`time-meridiem ${parsed.meridiem === "AM" ? "active" : ""}`}
              onClick={() => commit(parsed.displayHour, parsed.minute, "AM")}
            >
              AM
            </button>
            <button
              type="button"
              className={`time-meridiem ${parsed.meridiem === "PM" ? "active" : ""}`}
              onClick={() => commit(parsed.displayHour, parsed.minute, "PM")}
            >
              PM
            </button>
          </div>

          <div className="clock-face" role="listbox" aria-label="Pick hour">
            <div className="clock-hand" style={{ transform: `translateY(-50%) rotate(${handAngle}deg)` }} aria-hidden="true" />
            {HOURS.map((hour, index) => {
              const angle = (index / HOURS.length) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(angle) * clockRadius;
              const y = Math.sin(angle) * clockRadius;

              return (
                <button
                  key={hour}
                  type="button"
                  className={`clock-number ${parsed.displayHour === hour ? "active" : ""}`}
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commit(hour);
                  }}
                  onClick={() => commit(hour)}
                  title={`${hour} o'clock`}
                >
                  {hour}
                </button>
              );
            })}
            <div className="clock-center">
              <span>{parsed.displayHour}</span>
            </div>
          </div>

          <div className="time-minutes">
            {minutes.map((minute) => (
              <button
                key={minute}
                type="button"
                className={`time-minute ${parsed.minute === minute ? "active" : ""}`}
                onClick={() => commit(parsed.displayHour, minute)}
              >
                :{pad2(minute)}
              </button>
            ))}
          </div>
        </div>
        </>,
        document.body,
      ) : null}
    </div>
  );
}
