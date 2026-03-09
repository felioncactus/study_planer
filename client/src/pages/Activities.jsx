import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { apiCreateActivity, apiDeleteActivity, apiListActivities, apiUpdateActivity } from "../api/activities.api";

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

function toIsoFromLocalInput(v) {
  if (!v) return null;
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

export default function Activities() {
  const [activities, setActivities] = useState([]);

  const [title, setTitle] = useState("Gym");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const byId = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const data = await apiListActivities();
      setActivities(data.activities);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load activities");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setError("");

    const payload = {
      title,
      startAt: toIsoFromLocalInput(startAt),
      endAt: toIsoFromLocalInput(endAt),
      description: description.trim() ? description.trim() : null,
      location: location.trim() ? location.trim() : null,
    };

    try {
      await apiCreateActivity(payload);
      setTitle("Gym");
      setStartAt("");
      setEndAt("");
      setDescription("");
      setLocation("");
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to create activity");
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this activity?")) return;
    try {
      await apiDeleteActivity(id);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to delete activity");
    }
  }

  async function onQuickShift(id, minutes) {
    const a = byId.get(id);
    if (!a) return;
    const start = new Date(a.start_at);
    const end = new Date(a.end_at);
    start.setMinutes(start.getMinutes() + minutes);
    end.setMinutes(end.getMinutes() + minutes);
    try {
      await apiUpdateActivity(id, { startAt: start.toISOString(), endAt: end.toISOString() });
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to update activity");
    }
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ marginTop: 14, display: "grid", gap: 14 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Activities</h2>
          <div className="small muted">Meetings, gym, personal events — saved as calendar blocks (type: activity).</div>

          <form onSubmit={onCreate} style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                Start
                <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                End
                <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              Location (optional)
              <input value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              Description (optional)
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </label>

            <button className="btn" type="submit" disabled={!title.trim() || !startAt || !endAt}>
              Add activity
            </button>
          </form>

          {error ? <div style={{ color: "crimson", marginTop: 10 }}>{error}</div> : null}
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Your activities</h3>
            <button className="btn btn-ghost" onClick={refresh}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="small muted" style={{ marginTop: 10 }}>
              Loading…
            </div>
          ) : null}

          {!loading && !activities.length ? <div className="small muted">No activities yet.</div> : null}

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {activities.map((a) => (
              <div key={a.id} className="card" style={{ margin: 0 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 750 }}>{a.title}</div>
                    <div className="small muted">
                      {toLocalInputValue(a.start_at)} → {toLocalInputValue(a.end_at)}
                    </div>
                    {(a.meta?.location || a.meta?.description) ? (
                      <div className="small">
                        {a.meta?.location ? <span className="muted">📍 {a.meta.location}</span> : null}
                        {a.meta?.description ? <div style={{ marginTop: 6 }}>{a.meta.description}</div> : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => onQuickShift(a.id, -15)} title="Shift -15 min">
                      -15m
                    </button>
                    <button className="btn btn-ghost" onClick={() => onQuickShift(a.id, 15)} title="Shift +15 min">
                      +15m
                    </button>
                    <button className="btn" onClick={() => onDelete(a.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
