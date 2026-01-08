import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { apiTaskSummary, apiListTasks } from "../api/tasks.api";

function toYmd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
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

function Card({ title, value, hint }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 13, color: "#555" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, color: "#777", marginTop: 6 }}>{hint}</div> : null}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [weekTasks, setWeekTasks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      try {
        const s = await apiTaskSummary();
        if (cancelled) return;
        setSummary(s.summary);

        // also fetch tasks due this week to display a small preview list
        const start = startOfWeekMonday(new Date());
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        const t = await apiListTasks({ from: toYmd(start), to: toYmd(end) });
        if (cancelled) return;

        // show only not-done tasks in the preview
        setWeekTasks(t.tasks.filter((x) => x.status !== "done"));
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.error?.message || "Failed to load dashboard");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
        <h2>Dashboard</h2>
        <p>
          Logged in as: <b>{user?.email}</b>
        </p>

        {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 14 }}>
          <Card title="Overdue" value={summary ? summary.overdue : "…"} hint="Not done + past due date" />
          <Card title="Due today" value={summary ? summary.due_today : "…"} hint="Not done + due date = today" />
          <Card title="Due this week" value={summary ? summary.due_this_week : "…"} hint="Mon–Sun" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
          <Card title="Open tasks" value={summary ? summary.open_total : "…"} />
          <Card title="Todo" value={summary ? summary.todo : "…"} />
          <Card title="Doing" value={summary ? summary.doing : "…"} />
          <Card title="Done" value={summary ? summary.done : "…"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Quick actions</h3>
            <ul>
              <li><Link to="/courses">Create courses</Link> (CS101, Math, …)</li>
              <li><Link to="/tasks">Create tasks</Link> (assign due dates)</li>
              <li><Link to="/week">Weekly view</Link></li>
            </ul>
          </div>

          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>This week (not done)</h3>
            {weekTasks.length === 0 ? (
              <div>No upcoming tasks due this week.</div>
            ) : (
              <ul style={{ paddingLeft: 18 }}>
                {weekTasks.slice(0, 8).map((t) => (
                  <li key={t.id} style={{ marginBottom: 8 }}>
                    <b>{t.title}</b>{" "}
                    <span style={{ color: "#555" }}>
                      ({t.status}) {t.due_date ? `• due ${t.due_date}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: 10 }}>
              <Link to="/tasks">Go to Tasks →</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
