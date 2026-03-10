import React, { useEffect, useMemo, useState } from "react";
import { apiAiPlanTask } from "../api/tasks.api";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYmd(d) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
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

function calendarVisibleRange(anchor) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const gridStart = startOfWeekMonday(first);
  const gridEnd = endOfWeekSunday(last);
  return { gridStart, gridEnd };
}

function monthLabel(date) {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function timeLabel(iso) {
  const s = String(iso || "");
  if (s.includes("T")) return s.slice(11, 16);
  return s;
}

function levelClass(level) {
  if (level === "green") return "planner-day green";
  if (level === "yellow") return "planner-day yellow";
  if (level === "red") return "planner-day red";
  return "planner-day";
}

export default function TaskPlannerModal({ open, onClose, suggestions, onConfirm, currentStudyWindow, onStudyWindowChange, loading, taskTitle, taskDescription, taskDueDate, taskEstimatedMinutes }) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedYmd, setSelectedYmd] = useState(() => toYmd(new Date()));
  const [picked, setPicked] = useState(null); // { start, end } or { blocks: [...] }
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState(null);
  const [aiError, setAiError] = useState("");


  useEffect(() => {
    if (!open) {
      setPicked(null);
      setAiPlan(null);
      setAiError("");
      setAiLoading(false);
    }
  }, [open]);

  async function runAiPlan() {
    setAiError("");
    setAiPlan(null);
    try {
      setAiLoading(true);
      const d = await apiAiPlanTask({
        title: taskTitle,
        description: taskDescription,
        dueDate: taskDueDate,
        estimatedMinutes: taskEstimatedMinutes,
        horizonDays: 7,
        studyWindow: currentStudyWindow,
      });
      setAiPlan(d?.plan || null);
    } catch (err) {
      setAiError(err?.response?.data?.error?.message || "Failed to generate AI plan");
    } finally {
      setAiLoading(false);
    }
  }

  const PRESETS = useMemo(
    () => [
      { id: "evening", label: "Evening (18:00–22:00)", win: { start: "18:00", end: "22:00" } },
      { id: "morning", label: "Morning (06:00–10:00)", win: { start: "06:00", end: "10:00" } },
      { id: "afternoon", label: "Afternoon (12:00–18:00)", win: { start: "12:00", end: "18:00" } },
      { id: "day", label: "Day (08:00–22:00)", win: { start: "08:00", end: "22:00" } },
      { id: "custom", label: "Custom…", win: null },
    ],
    []
  );

  const [windowPreset, setWindowPreset] = useState("evening");
  const [customStart, setCustomStart] = useState("18:00");
  const [customEnd, setCustomEnd] = useState("22:00");

  // Keep inputs in sync with server-chosen window
  useEffect(() => {
    const win = currentStudyWindow || suggestions?.studyWindow;
    if (!win?.start || !win?.end) return;

    setCustomStart(win.start);
    setCustomEnd(win.end);

    const match = PRESETS.find((p) => p.win && p.win.start === win.start && p.win.end === win.end);
    if (match) setWindowPreset(match.id);
    else setWindowPreset("custom");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suggestions?.studyWindow?.start, suggestions?.studyWindow?.end, currentStudyWindow?.start, currentStudyWindow?.end]);

  function applyWindow(win) {
    setPicked(null);
    if (typeof onStudyWindowChange === "function") onStudyWindowChange(win);
  }

  const dayMap = useMemo(() => {
    const m = new Map();
    for (const d of suggestions?.days ?? []) m.set(d.date, d);
    return m;
  }, [suggestions]);

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

  const selectedInfo = dayMap.get(selectedYmd);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 750, fontSize: 18 }}>Plan this task</div>
            <div className="small muted">
              Green = fits in one session • Red = too busy
            </div>
            <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <label className="small muted" style={{ minWidth: 90 }}>
                Planning window
              </label>
              <select
                value={windowPreset}
                onChange={(e) => {
                  const id = e.target.value;
                  setWindowPreset(id);
                  const preset = PRESETS.find((p) => p.id === id);
                  if (preset?.win) applyWindow(preset.win);
                }}
                className="input"
                style={{ maxWidth: 260 }}
                disabled={!!loading}
              >
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>

              {windowPreset === "custom" ? (
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <input
                    className="input"
                    type="time"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    disabled={!!loading}
                  />
                  <span className="small muted">to</span>
                  <input
                    className="input"
                    type="time"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    disabled={!!loading}
                  />
                  <button
                    className="btn btn-ghost"
                    onClick={() => applyWindow({ start: customStart, end: customEnd })}
                    disabled={!!loading}
                    title="Recalculate suggestions for this window"
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <div className="small muted">
                  Study window: {(currentStudyWindow?.start ?? suggestions?.studyWindow?.start)}–{(currentStudyWindow?.end ?? suggestions?.studyWindow?.end)}
                </div>
              )}
            </div>

          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="planner-grid">
          <div className="planner-calendar">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <button className="btn btn-ghost" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}>
                ←
              </button>
              <div style={{ fontWeight: 700 }}>{monthLabel(anchor)}</div>
              <button className="btn btn-ghost" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}>
                →
              </button>
            </div>

            <div className="planner-weekdays">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
                <div key={w} className="small muted" style={{ textAlign: "center" }}>
                  {w}
                </div>
              ))}
            </div>

            <div className="planner-days">
              {days.map((d) => {
                const ymd = toYmd(d);
                const info = dayMap.get(ymd);
                const inMonth = d.getMonth() === anchor.getMonth();
                const isSelected = ymd === selectedYmd;

                return (
                  <button
                    key={ymd}
                    className={levelClass(info?.level)}
                    style={{
                      opacity: inMonth ? 1 : 0.35,
                      outline: isSelected ? "2px solid var(--primary)" : "none",
                    }}
                    onClick={() => {
                      setSelectedYmd(ymd);
                      setPicked(null);
                    }}
                    title={info ? `${info.freeMinutes} free minutes` : "No data"}
                  >
                    <span className="small" style={{ fontWeight: 700 }}>
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="planner-slots">
            <div style={{ fontWeight: 750, marginBottom: 6 }}>
              {selectedYmd} • Best time windows
            </div>
            {selectedInfo?.slots?.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {selectedInfo.slots.map((s) => {
                  const can = !!s.fits;
                  const isPicked = picked?.start === s.start && picked?.end === s.end;
                  return (
                    <button
                      key={s.start}
                      className={"btn " + (isPicked ? "" : "btn-ghost")}
                      disabled={!can}
                      onClick={() => setPicked({ start: s.start, end: s.end })}
                      title={can ? "Click to pick this window" : `Too short (${s.freeMinutes}m)`}
                      style={{ justifyContent: "space-between" }}
                    >
                      <span>
                        {timeLabel(s.start)}–{timeLabel(s.end)}
                      </span>
                      <span className="small muted">{s.freeMinutes}m</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="small muted">No free time inside your study window.</div>
            )}


            <div className="card" style={{ marginTop: 14, padding: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>AI week rearrange</div>
                  <div className="small muted">If it looks like there is no good time, ask AI to fit it into your week (or split it into parts).</div>
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={runAiPlan}
                  disabled={aiLoading || !taskTitle}
                  title="Ask AI to pick the best time (or split into parts)"
                >
                  {aiLoading ? "Planning..." : "AI arrange week"}
                </button>
              </div>

              {aiError ? <div className="small" style={{ marginTop: 8, color: "crimson" }}>{aiError}</div> : null}

              {aiPlan ? (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <div className="small">
                    <b>Plan:</b> {aiPlan.mode === "split" ? "Split into parts" : "Single block"} • Total {aiPlan.totalMinutes} min
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    {aiPlan.blocks?.map((b, i) => (
                      <div key={i} className="small" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span>{b.label || taskTitle}</span>
                        <span style={{ whiteSpace: "nowrap" }}>
                          {String(b.start).replace("T", " ").slice(0, 16)} → {String(b.end).replace("T", " ").slice(0, 16)} ({b.minutes}m)
                        </span>
                      </div>
                    ))}
                  </div>

                  {aiPlan.notes ? <div className="small muted">{aiPlan.notes}</div> : null}

                  <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        if (!aiPlan?.blocks?.length) return;
                        if (aiPlan.blocks.length === 1) {
                          setPicked({ start: aiPlan.blocks[0].start, end: aiPlan.blocks[0].end });
                        } else {
                          setPicked({ blocks: aiPlan.blocks.map((x) => ({ start_at: x.start, end_at: x.end, title: x.label || taskTitle, minutes: x.minutes })) });
                        }
                      }}
                    >
                      Use this plan
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="row" style={{ justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn"
                disabled={!picked}
                onClick={() => onConfirm(picked)}
                title={!picked ? "Pick a time window first" : "Create task with planned time"}
              >
                Create task
              </button>
            </div>
          </div>
        </div>

        <div className="small muted" style={{ marginTop: 10 }}>
          Tip: picked time creates a calendar block. You can still change task status later.
        </div>
      </div>
    </div>
  );
}
