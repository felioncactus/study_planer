
import React, { useEffect, useMemo, useState } from "react";
import RoundTimePicker from "../components/RoundTimePicker";
import MobileDateField from "../components/MobileDateField";
import Navbar from "../components/Navbar";
import ActivityPlannerModal from "../components/ActivityPlannerModal";
import { apiCreateActivity, apiDeleteActivity, apiListActivities, apiUpdateActivity } from "../api/activities.api";
import { apiTaskSuggestions as taskSuggestionsApi } from "../api/tasks.api";

function toLocalInputValue(d) {
  if (!d) return "";
  const dt = new Date(d);
  const pad2 = (n) => String(n).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const mm = pad2(dt.getMonth() + 1);
  const dd = pad2(dt.getDate());
  const hh = pad2(dt.getHours());
  const mi = pad2(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function toIso(input) {
  if (!input) return null;
  return new Date(input).toISOString();
}

function plusMinutes(localDateTime, minutes) {
  const date = new Date(localDateTime);
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  return toLocalInputValue(date);
}

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [title, setTitle] = useState("Gym session");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [preferredDate, setPreferredDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerStudyWindow, setPlannerStudyWindow] = useState({ start: "18:00", end: "22:00" });
  const [plannerData, setPlannerData] = useState(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const totalMinutes = useMemo(() => {
    if (startAt && endAt) {
      const diff = Math.round((new Date(endAt) - new Date(startAt)) / 60000);
      if (diff > 0) return diff;
    }
    return Number(durationMinutes || 60);
  }, [startAt, endAt, durationMinutes]);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const data = await apiListActivities();
      setActivities(data.activities || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load activities");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function openPlanner(e) {
    e.preventDefault();
    setError("");
    try {
      setPlannerLoading(true);
      const data = await taskSuggestionsApi({
        dueDate: preferredDate || null,
        estimatedMinutes: totalMinutes,
        studyWindow: plannerStudyWindow,
      });
      setPlannerData(data.suggestions || null);
      if (data?.suggestions?.studyWindow) setPlannerStudyWindow(data.suggestions.studyWindow);
      setPlannerOpen(true);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load activity planner");
    } finally {
      setPlannerLoading(false);
    }
  }

  async function createManual() {
    setError("");
    try {
      await apiCreateActivity({
        title: title.trim(),
        startAt: toIso(startAt),
        endAt: toIso(endAt),
        description: description.trim() || null,
        location: location.trim() || null,
      });
      setTitle("Gym session");
      setDescription("");
      setLocation("");
      setStartAt("");
      setEndAt("");
      setPreferredDate("");
      setDurationMinutes(60);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to create activity");
    }
  }

  async function createWithPickedSlot(picked) {
    setError("");
    try {
      await apiCreateActivity({
        title: title.trim(),
        startAt: picked.start,
        endAt: picked.end,
        description: description.trim() || null,
        location: location.trim() || null,
      });
      setPlannerOpen(false);
      setPlannerData(null);
      setTitle("Gym session");
      setDescription("");
      setLocation("");
      setStartAt("");
      setEndAt("");
      setPreferredDate("");
      setDurationMinutes(60);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to create activity");
    }
  }

  async function onDelete(id) {
    setError("");
    try {
      await apiDeleteActivity(id);
      setActivities((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to delete activity");
    }
  }

  async function onQuickShift(id, deltaMinutes) {
    setError("");
    try {
      const activity = activities.find((item) => item.id === id);
      if (!activity) return;

      const nextStart = new Date(activity.start_at);
      const nextEnd = new Date(activity.end_at);
      nextStart.setMinutes(nextStart.getMinutes() + deltaMinutes);
      nextEnd.setMinutes(nextEnd.getMinutes() + deltaMinutes);

      const data = await apiUpdateActivity(id, {
        startAt: nextStart.toISOString(),
        endAt: nextEnd.toISOString(),
      });

      setActivities((prev) => prev.map((item) => (item.id === id ? data.activity : item)));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to move activity");
    }
  }

  return (
    <>
      <Navbar />
      <div className="container stack activity-page-shell" style={{ marginTop: 18 }}>
        <div className="page-header">
          <div>
            <div className="title">Activities</div>
            <div className="small muted">
              Create fixed events with the same AI planning flow you already use for tasks.
            </div>
          </div>
        </div>

        {error ? <div className="notice notice-danger">{error}</div> : null}

        <div className="card">
          <div className="section-title">Create activity</div>
          <form onSubmit={openPlanner} className="form-grid" style={{ marginTop: 12 }}>
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>

            <label>
              Description (optional)
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </label>

            <div className="two-col three-col-on-desktop">
              <label>
                Duration (minutes)
                <input type="number" min="15" step="15" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
              </label>

              <label>
                <MobileDateField label="Preferred date" value={preferredDate} onChange={(nextDate) => {
                  setPreferredDate(nextDate);
                  if (nextDate && startAt) setStartAt(`${nextDate}T${startAt.slice(11, 16)}`);
                  if (nextDate && endAt) setEndAt(`${nextDate}T${endAt.slice(11, 16)}`);
                }} />
              </label>

              <label>
                Location (optional)
                <input value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
            </div>

            <div className="two-col">
              <MobileDateField
                label="Manual start"
                mode="datetime"
                value={startAt}
                onChange={(nextValue) => {
                  setStartAt(nextValue);
                  if (!endAt && nextValue) setEndAt(plusMinutes(nextValue, totalMinutes || 60));
                }}
              />
              <MobileDateField
                label="Manual end"
                mode="datetime"
                value={endAt}
                onChange={setEndAt}
              />
            </div>

            <div className="two-col">
              <div className="card" style={{ padding: 12 }}>
                <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>Start time</div>
                <RoundTimePicker
                  value={startAt ? startAt.slice(11, 16) : ""}
                  onChange={(value) => {
                    const baseDate = startAt?.slice(0, 10) || preferredDate || new Date().toISOString().slice(0, 10);
                    setStartAt(`${baseDate}T${value}`);
                    if (endAt || totalMinutes) {
                      const startDate = new Date(`${baseDate}T${value}`);
                      const nextEnd = new Date(startDate);
                      nextEnd.setMinutes(nextEnd.getMinutes() + totalMinutes);
                      setEndAt(toLocalInputValue(nextEnd));
                    }
                  }}
                />
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>End time</div>
                <RoundTimePicker
                  value={endAt ? endAt.slice(11, 16) : ""}
                  onChange={(value) => {
                    const baseDate = endAt?.slice(0, 10) || startAt?.slice(0, 10) || preferredDate || new Date().toISOString().slice(0, 10);
                    setEndAt(`${baseDate}T${value}`);
                  }}
                />
              </div>
            </div>

            <div className="small muted">
              Activities now use the same rounded time-picking flow as task planning, with exact manual start and end times.
            </div>

            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!title.trim() || !startAt || !endAt}
                onClick={createManual}
              >
                Save manually
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!title.trim() || plannerLoading}
              >
                {plannerLoading ? "Loading planner..." : "Plan activity"}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="section-title">Your activities</div>
              <div className="small muted">{activities.length} saved block{activities.length === 1 ? "" : "s"}</div>
            </div>
            <button className="btn btn-ghost" onClick={refresh}>Refresh</button>
          </div>

          {loading ? <div className="small muted" style={{ marginTop: 10 }}>Loading…</div> : null}
          {!loading && !activities.length ? <div className="small muted" style={{ marginTop: 10 }}>No activities yet.</div> : null}

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {activities.map((activity) => (
              <div key={activity.id} className="card" style={{ margin: 0 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 750 }}>{activity.title}</div>
                    <div className="small muted">
                      {toLocalInputValue(activity.start_at)} → {toLocalInputValue(activity.end_at)}
                    </div>
                    {activity.meta?.location ? <div className="small muted">📍 {activity.meta.location}</div> : null}
                    {activity.meta?.description ? <div className="small">{activity.meta.description}</div> : null}
                  </div>

                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => onQuickShift(activity.id, -15)}>-15m</button>
                    <button className="btn btn-ghost" onClick={() => onQuickShift(activity.id, 15)}>+15m</button>
                    <button className="btn btn-danger" onClick={() => onDelete(activity.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ActivityPlannerModal
        open={plannerOpen}
        onClose={() => {
          setPlannerOpen(false);
          setPlannerData(null);
        }}
        onConfirm={createWithPickedSlot}
        suggestions={plannerData}
        loading={plannerLoading}
        currentStudyWindow={plannerStudyWindow}
        onStudyWindowChange={async (windowValue) => {
          setPlannerStudyWindow(windowValue);
          setPlannerLoading(true);
          try {
            const data = await taskSuggestionsApi({
              dueDate: preferredDate || null,
              estimatedMinutes: totalMinutes,
              studyWindow: windowValue,
            });
            setPlannerData(data.suggestions || null);
          } catch (err) {
            setError(err?.response?.data?.error?.message || "Failed to update planner");
          } finally {
            setPlannerLoading(false);
          }
        }}
        activityTitle={title}
        activityDescription={description}
        preferredDate={preferredDate || null}
        activityMinutes={totalMinutes}
      />
    </>
  );
}
