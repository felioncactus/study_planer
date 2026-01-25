import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiGetCourse } from "../api/courses.api";
import { apiCreateTask, apiListTasks, apiUpdateTask, apiDeleteTask } from "../api/tasks.api";

function fmtTime(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

function formatTimeRange(start, end) {
  if (!start && !end) return "";
  if (start && end) return `${fmtTime(start)}–${fmtTime(end)}`;
  return start ? `${fmtTime(start)}` : `${fmtTime(end)}`;
}

function Pill({ children }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
        color: "#374151",
      }}
    >
      {children}
    </span>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newStatus, setNewStatus] = useState("todo");

  const headerStyle = useMemo(() => {
    if (!course) return {};
    const bg = course.banner_url ? `url(${course.banner_url})` : "none";
    return {
      height: 160,
      backgroundImage: bg,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: course.banner_url ? undefined : "#f3f4f6",
      borderRadius: 18,
      overflow: "hidden",
      position: "relative",
      border: "1px solid #e5e7eb",
    };
  }, [course]);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const [c, t] = await Promise.all([apiGetCourse(id), apiListTasks({ courseId: id })]);
      setCourse(c.course);
      setTasks(t.tasks);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onCreateTask(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = { title: newTitle, status: newStatus, courseId: id };
      if (newDue) payload.dueDate = newDue;
      const data = await apiCreateTask(payload);
      setTasks((prev) => [data.task, ...prev]);
      setNewTitle("");
      setNewDue("");
      setNewStatus("todo");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to create task");
    }
  }

  async function setTaskStatus(taskId, status) {
    setError("");
    try {
      const data = await apiUpdateTask(taskId, { status });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to update task");
    }
  }

  async function deleteTask(taskId) {
    setError("");
    try {
      await apiDeleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to delete task");
    }
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Link to="/courses">← Back to courses</Link>
          <Link to={`/tasks?courseId=${encodeURIComponent(id)}`}>Open tasks page →</Link>
        </div>

        {loading ? (
          <div style={{ marginTop: 14 }}>Loading…</div>
        ) : course ? (
          <>
            <div style={{ marginTop: 14, ...headerStyle }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: course.banner_url ? "rgba(0,0,0,0.18)" : "transparent",
                }}
              />
              <div style={{ position: "absolute", left: 16, bottom: 16, display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 22,
                    overflow: "hidden",
                    border: "4px solid white",
                    background: course.color || "#e5e7eb",
                    display: "grid",
                    placeItems: "center",
                    flex: "0 0 auto",
                  }}
                >
                  {course.image_url ? (
                    <img src={course.image_url} alt={course.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontWeight: 900, fontSize: 18, color: "#111" }}>
                      {(course.name || "?").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div style={{ color: course.banner_url ? "white" : "#111" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>{course.name}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {course.day_of_week || course.start_time || course.end_time ? (
                      <Pill>
                        {course.day_of_week ? `${course.day_of_week} ` : ""}
                        {formatTimeRange(course.start_time, course.end_time)}
                      </Pill>
                    ) : null}
                    {course.midterm_date ? <Pill>Midterm: {course.midterm_date}</Pill> : null}
                    {course.final_date ? <Pill>Final: {course.final_date}</Pill> : null}
                    {course.color ? <Pill>{course.color}</Pill> : null}
                  </div>
                </div>
              </div>
            </div>

            {course.description ? (
              <div className="card" style={{ marginTop: 14 }}>
                <h3 style={{ marginTop: 0 }}>Description</h3>
                <div style={{ whiteSpace: "pre-wrap", color: "#374151" }}>{course.description}</div>
              </div>
            ) : null}

            <div className="card" style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <h3 style={{ margin: 0 }}>Tasks for this course</h3>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{tasks.length} total</div>
              </div>

              <form onSubmit={onCreateTask} style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "2fr 1fr 1fr" }}>
                  <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New task title" />
                  <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="todo">todo</option>
                    <option value="doing">doing</option>
                    <option value="done">done</option>
                  </select>
                </div>
                <button type="submit" disabled={!newTitle.trim()}>
                  Add task
                </button>
              </form>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {tasks.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>No tasks yet.</div>
                ) : (
                  tasks.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 12,
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: "#111" }}>{t.title}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                          {t.due_date ? `Due: ${t.due_date} • ` : ""}
                          Status: {t.status}
                        </div>
                        {t.description ? (
                          <div style={{ marginTop: 6, fontSize: 13, color: "#374151", whiteSpace: "pre-wrap" }}>
                            {t.description}
                          </div>
                        ) : null}
                      </div>

                      <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {t.status !== "todo" ? <button onClick={() => setTaskStatus(t.id, "todo")}>todo</button> : null}
                        {t.status !== "doing" ? <button onClick={() => setTaskStatus(t.id, "doing")}>doing</button> : null}
                        {t.status !== "done" ? <button onClick={() => setTaskStatus(t.id, "done")}>done</button> : null}
                        <button onClick={() => deleteTask(t.id)} style={{ color: "crimson" }}>
                          delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {error ? <div style={{ color: "crimson", marginTop: 12 }}>{error}</div> : null}
          </>
        ) : (
          <div style={{ marginTop: 14 }}>Course not found.</div>
        )}

        {error && !course ? <div style={{ color: "crimson", marginTop: 12 }}>{error}</div> : null}
      </div>
    </>
  );
}
