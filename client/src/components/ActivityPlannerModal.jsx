
import RoundTimePicker from "./RoundTimePicker";
import React, { useEffect, useMemo, useState } from "react";
import { apiAiPlanActivity } from "../api/activities.api";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYmd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
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

function calendarVisibleRange(anchor) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { gridStart: startOfWeekMonday(first), gridEnd: endOfWeekSunday(last) };
}

function monthLabel(date) {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function timeLabel(iso) {
  const s = String(iso || "");
  return s.includes("T") ? s.slice(11, 16) : s;
}

function levelClass(level) {
  if (level === "green") return "planner-day green";
  if (level === "yellow") return "planner-day yellow";
  if (level === "red") return "planner-day red";
  return "planner-day";
}

export default function ActivityPlannerModal({
  open,
  onClose,
  onConfirm,
  suggestions,
  loading,
  currentStudyWindow,
  onStudyWindowChange,
  activityTitle,
  activityDescription,
  preferredDate,
  activityMinutes,
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedYmd, setSelectedYmd] = useState(() => toYmd(new Date()));
  const [picked, setPicked] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [windowPreset, setWindowPreset] = useState("evening");
  const [customStart, setCustomStart] = useState("18:00");
  const [customEnd, setCustomEnd] = useState("22:00");

  const presets = useMemo(
    () => [
      { id: "evening", label: "Evening (18:00–22:00)", win: { start: "18:00", end: "22:00" } },
      { id: "morning", label: "Morning (06:00–10:00)", win: { start: "06:00", end: "10:00" } },
      { id: "afternoon", label: "Afternoon (12:00–18:00)", win: { start: "12:00", end: "18:00" } },
      { id: "day", label: "Day (08:00–22:00)", win: { start: "08:00", end: "22:00" } },
      { id: "custom", label: "Custom…", win: null },
    ],
    []
  );

  useEffect(() => {
    if (!open) {
      setPicked(null);
      setAiPlan(null);
      setAiError("");
      setAiLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const win = currentStudyWindow || suggestions?.studyWindow;
    if (!win?.start || !win?.end) return;
    setCustomStart(win.start);
    setCustomEnd(win.end);
    const preset = presets.find((entry) => entry.win && entry.win.start === win.start && entry.win.end === win.end);
    setWindowPreset(preset?.id || "custom");
  }, [currentStudyWindow?.start, currentStudyWindow?.end, suggestions?.studyWindow?.start, suggestions?.studyWindow?.end, presets]);

  async function runAiPlan() {
    setAiPlan(null);
    setAiError("");
    try {
      setAiLoading(true);
      const data = await apiAiPlanActivity({
        title: activityTitle,
        description: activityDescription,
        preferredDate,
        estimatedMinutes: activityMinutes,
        horizonDays: 7,
        studyWindow: currentStudyWindow,
      });
      setAiPlan(data?.plan || null);
    } catch (err) {
      setAiError(err?.response?.data?.error?.message || "Failed to plan activity");
    } finally {
      setAiLoading(false);
    }
  }

  function applyWindow(win) {
    setPicked(null);
    onStudyWindowChange?.(win);
  }

  const dayMap = useMemo(() => {
    const map = new Map();
    for (const day of suggestions?.days || []) map.set(day.date, day);
    return map;
  }, [suggestions]);

  const { gridStart } = useMemo(() => calendarVisibleRange(anchor), [anchor]);
  const days = useMemo(() => {
    const out = [];
    const d = new Date(gridStart);
    for (let i = 0; i < 42; i += 1) {
      out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [gridStart]);

  const selectedInfo = dayMap.get(selectedYmd);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 750, fontSize: 18 }}>Plan this activity</div>
            <div className="small muted">
              Pick a clean time slot first, then save the activity.
            </div>
            <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <label className="small muted" style={{ minWidth: 90 }}>Planning window</label>
              <select
                value={windowPreset}
                onChange={(e) => {
                  const id = e.target.value;
                  setWindowPreset(id);
                  const preset = presets.find((entry) => entry.id === id);
                  if (preset?.win) applyWindow(preset.win);
                }}
                className="input"
                style={{ maxWidth: 260 }}
                disabled={!!loading}
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.label}</option>
                ))}
              </select>

              {windowPreset === "custom" ? (
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <RoundTimePicker value={customStart} onChange={setCustomStart} disabled={!!loading} />
                  <span className="small muted">to</span>
                  <RoundTimePicker value={customEnd} onChange={setCustomEnd} disabled={!!loading} />
                  <button className="btn btn-ghost" onClick={() => applyWindow({ start: customStart, end: customEnd })} disabled={!!loading}>
                    Apply
                  </button>
                </div>
              ) : (
                <div className="small muted">
                  Window: {(currentStudyWindow?.start ?? suggestions?.studyWindow?.start)}–{(currentStudyWindow?.end ?? suggestions?.studyWindow?.end)}
                </div>
              )}
            </div>
          </div>

          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="planner-grid">
          <div className="planner-calendar">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <button className="btn btn-ghost" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}>←</button>
              <div style={{ fontWeight: 700 }}>{monthLabel(anchor)}</div>
              <button className="btn btn-ghost" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}>→</button>
            </div>

            <div className="planner-weekdays">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                <div key={label} className="small muted" style={{ textAlign: "center" }}>{label}</div>
              ))}
            </div>

            <div className="planner-days">
              {days.map((dateObj) => {
                const ymd = toYmd(dateObj);
                const info = dayMap.get(ymd);
                const inMonth = dateObj.getMonth() === anchor.getMonth();
                const isSelected = selectedYmd === ymd;

                return (
                  <button
                    key={ymd}
                    className={levelClass(info?.level)}
                    style={{ opacity: inMonth ? 1 : 0.35, outline: isSelected ? "2px solid var(--primary)" : "none" }}
                    onClick={() => {
                      setSelectedYmd(ymd);
                      setPicked(null);
                    }}
                  >
                    <span className="small" style={{ fontWeight: 700 }}>{dateObj.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="planner-slots">
            <div style={{ fontWeight: 750, marginBottom: 6 }}>
              {selectedYmd} • Suggested windows
            </div>

            {selectedInfo?.slots?.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {selectedInfo.slots.map((slot) => {
                  const isPicked = picked?.start === slot.start && picked?.end === slot.end;
                  return (
                    <button
                      key={slot.start}
                      className={"btn " + (isPicked ? "" : "btn-ghost")}
                      disabled={!slot.fits}
                      onClick={() => setPicked({ start: slot.start, end: slot.end })}
                      style={{ justifyContent: "space-between" }}
                      title={slot.fits ? "Use this slot" : `Too short (${slot.freeMinutes}m)`}
                    >
                      <span>{timeLabel(slot.start)}–{timeLabel(slot.end)}</span>
                      <span className="small muted">{slot.freeMinutes}m</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="small muted">No free time inside this planning window.</div>
            )}

            <div className="card" style={{ marginTop: 14, padding: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>AI arrange week</div>
                  <div className="small muted">Ask AI to place this activity into the best slot or split the plan when needed.</div>
                </div>
                <button type="button" className="btn" onClick={runAiPlan} disabled={aiLoading || !activityTitle}>
                  {aiLoading ? "Planning..." : "AI arrange week"}
                </button>
              </div>

              {aiError ? <div className="small" style={{ marginTop: 8, color: "crimson" }}>{aiError}</div> : null}

              {aiPlan ? (
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  <div className="small"><b>Plan:</b> {aiPlan.mode === "split" ? "Split plan" : "Single block"} • {aiPlan.totalMinutes} min</div>
                  {(aiPlan.blocks || []).map((block, index) => (
                    <div key={index} className="small" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span>{block.label || activityTitle}</span>
                      <span style={{ whiteSpace: "nowrap" }}>
                        {String(block.start).replace("T", " ").slice(0, 16)} → {String(block.end).replace("T", " ").slice(0, 16)}
                      </span>
                    </div>
                  ))}
                  {aiPlan.notes ? <div className="small muted">{aiPlan.notes}</div> : null}
                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        const first = aiPlan?.blocks?.[0];
                        if (first) setPicked({ start: first.start, end: first.end });
                      }}
                    >
                      Use first slot
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="row" style={{ justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn" disabled={!picked} onClick={() => onConfirm(picked)}>
                Create activity
              </button>
            </div>
          </div>
        </div>

        <div className="small muted" style={{ marginTop: 10 }}>
          The picked time becomes a fixed activity block on your calendar.
        </div>
      </div>
    </div>
  );
}
