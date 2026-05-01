
import RoundTimePicker from "./RoundTimePicker";
import React, { useEffect, useMemo, useState } from "react";
import { apiAiPlanActivity } from "../api/activities.api";
import { useLanguage } from "../context/LanguageContext";

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

const LOCALE_BY_LANGUAGE = {
  en: "en-US",
  ru: "ru-RU",
  ko: "ko-KR",
  kk: "kk-KZ",
  uz: "uz-UZ",
};

function monthLabel(date, language) {
  return date.toLocaleString(LOCALE_BY_LANGUAGE[language] || undefined, { month: "long", year: "numeric" });
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
  const { language, t } = useLanguage();
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedYmd, setSelectedYmd] = useState(() => toYmd(new Date()));
  const [picked, setPicked] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [mobileSlotsOpen, setMobileSlotsOpen] = useState(false);
  const [windowPreset, setWindowPreset] = useState("evening");
  const [customStart, setCustomStart] = useState("18:00");
  const [customEnd, setCustomEnd] = useState("22:00");

  const presets = useMemo(
    () => [
      { id: "evening", label: "Evening (18:00â€“22:00)", win: { start: "18:00", end: "22:00" } },
      { id: "morning", label: "Morning (06:00â€“10:00)", win: { start: "06:00", end: "10:00" } },
      { id: "afternoon", label: "Afternoon (12:00â€“18:00)", win: { start: "12:00", end: "18:00" } },
      { id: "day", label: "Day (08:00â€“22:00)", win: { start: "08:00", end: "22:00" } },
      { id: "custom", label: "Customâ€¦", win: null },
    ],
    []
  );

  useEffect(() => {
    if (!open) {
      setPicked(null);
      setAiPlan(null);
      setAiError("");
      setAiLoading(false);
      setMobileSlotsOpen(false);
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

  function openSlotsOnMobile() {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches) {
      setMobileSlotsOpen(true);
    }
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
    <div className="modal-backdrop planner-modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card planner-modal-card">
        <div className="row planner-modal-header" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div className="planner-modal-title-block">
            <div className="planner-modal-title" style={{ fontWeight: 750, fontSize: 18 }}>{t("Plan this activity")}</div>
            <div className="small muted">
              {t("Pick a clean time slot first, then save the activity.")}
            </div>
            <div className="row planner-window-row" style={{ gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <label className="small muted" style={{ minWidth: 90 }}>{t("Planning window")}</label>
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
                  <span className="small muted">{t("to")}</span>
                  <RoundTimePicker value={customEnd} onChange={setCustomEnd} disabled={!!loading} />
                  <button className="btn btn-ghost" onClick={() => applyWindow({ start: customStart, end: customEnd })} disabled={!!loading}>
                    {t("Apply")}
                  </button>
                </div>
              ) : (
                <div className="small muted">
                  {t("Window")}: {(currentStudyWindow?.start ?? suggestions?.studyWindow?.start)}-{(currentStudyWindow?.end ?? suggestions?.studyWindow?.end)}
                </div>
              )}
            </div>
          </div>

          <button className="btn btn-ghost planner-close-btn" onClick={onClose}>âœ•</button>
        </div>

        <div className="planner-grid">
          <div className="planner-calendar">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <button className="btn btn-ghost" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}>â†</button>
              <div style={{ fontWeight: 700 }}>{monthLabel(anchor, language)}</div>
              <button className="btn btn-ghost" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}>â†’</button>
            </div>

            <div className="planner-weekdays">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                <div key={label} className="small muted" style={{ textAlign: "center" }}>{t(label)}</div>
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
                      openSlotsOnMobile();
                    }}
                  >
                    <span className="small" style={{ fontWeight: 700 }}>{dateObj.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="planner-mobile-slot-launch">
            <button type="button" className="btn btn-primary" onClick={() => setMobileSlotsOpen(true)}>
              {t("Suggested windows and AI")}
            </button>
            {picked ? <div className="small muted">{t("A time plan is selected. Open to review or change it.")}</div> : null}
          </div>

          <div className={`planner-slots${mobileSlotsOpen ? " is-mobile-open" : ""}`}>
            <div className="planner-mobile-sheet-head">
              <div>
                <div style={{ fontWeight: 750 }}>{t("Suggested windows")}</div>
                <div className="small muted">{selectedYmd}</div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setMobileSlotsOpen(false)} aria-label="Close suggested windows">
                X
              </button>
            </div>
            <div className="planner-slots-title" style={{ fontWeight: 750, marginBottom: 6 }}>
              {selectedYmd} • {t("Suggested windows")}
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
                      onClick={() => {
                        setPicked({ start: slot.start, end: slot.end });
                      }}
                      style={{ justifyContent: "space-between" }}
                      title={slot.fits ? "Use this slot" : `Too short (${slot.freeMinutes}m)`}
                    >
                      <span>{timeLabel(slot.start)}â€“{timeLabel(slot.end)}</span>
                      <span className="small muted">{slot.freeMinutes}m</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="small muted">{t("No free time inside this planning window.")}</div>
            )}

            <div className="card" style={{ marginTop: 14, padding: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{t("AI arrange week")}</div>
                  <div className="small muted">{t("Ask AI to place this activity into the best slot or split the plan when needed.")}</div>
                </div>
                <button type="button" className="btn" onClick={runAiPlan} disabled={aiLoading || !activityTitle}>
                  {aiLoading ? t("Planning...") : t("AI arrange week")}
                </button>
              </div>

              {aiError ? <div className="small" style={{ marginTop: 8, color: "crimson" }}>{aiError}</div> : null}

              {aiPlan ? (
                <div className="planner-ai-plan">
                  <div className="small"><b>Plan:</b> {aiPlan.mode === "split" ? "Split plan" : "Single block"} â€¢ {aiPlan.totalMinutes} min</div>
                  {(aiPlan.blocks || []).map((block, index) => (
                    <div key={index} className="small planner-ai-block">
                      <span>{block.label || activityTitle}</span>
                      <span className="planner-ai-time">
                        {String(block.start).replace("T", " ").slice(0, 16)} â†’ {String(block.end).replace("T", " ").slice(0, 16)}
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
                        if (first) {
                          setPicked({ start: first.start, end: first.end });
                        }
                      }}
                    >
                      {t("Use first slot")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="row planner-modal-footer" style={{ justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
              <button className="btn" disabled={!picked} onClick={() => onConfirm(picked)}>
                {t("Create activity")}
              </button>
            </div>
          </div>
        </div>

        <div className="small muted" style={{ marginTop: 10 }}>
          {t("The picked time becomes a fixed activity block on your calendar.")}
        </div>
      </div>
    </div>
  );
}
