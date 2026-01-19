import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { apiListTasks } from "../api/tasks.api";

function toYmd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // move to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function Weekly() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const { from, to } = useMemo(() => {
    const start = startOfWeekMonday(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: toYmd(start), to: toYmd(end) };
  }, [anchor]);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const data = await apiListTasks({ from, to });
      setTasks(data.tasks);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load weekly tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [from, to]);

  function prevWeek() {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7);
    setAnchor(d);
  }

  function nextWeek() {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 7);
    setAnchor(d);
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
        <h2>Weekly View</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={prevWeek}>◀ Prev</button>
          <div>
            <b>{from}</b> → <b>{to}</b>
          </div>
          <button onClick={nextWeek}>Next ▶</button>
        </div>

        {error && <div style={{ color: "crimson", marginBottom: 10 }}>{error}</div>}

        <div className="card">
          {loading ? (
            <div>Loading...</div>
          ) : tasks.length === 0 ? (
            <div>No tasks due this week.</div>
          ) : (
            <ul style={{ paddingLeft: 18 }}>
              {tasks.map((t) => (
                <li key={t.id} style={{ marginBottom: 10 }}>
                  <b>{t.title}</b>{" "}
                  <span style={{ color: "#555" }}>
                    ({t.status}) {t.due_date ? `• due ${t.due_date}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
