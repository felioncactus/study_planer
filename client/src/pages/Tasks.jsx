import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { apiListCourses } from "../api/courses.api";
import { apiCreateTask, apiDeleteTask, apiListTasks, apiUpdateTask } from "../api/tasks.api";

export default function Tasks() {
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("Homework 1");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("todo");
  const [courseId, setCourseId] = useState("");

  const [filterStatus, setFilterStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const courseMap = useMemo(() => {
    const m = new Map();
    for (const c of courses) m.set(c.id, c);
    return m;
  }, [courses]);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const [cData, tData] = await Promise.all([
        apiListCourses(),
        apiListTasks(filterStatus ? { status: filterStatus } : {}),
      ]);
      setCourses(cData.courses);
      setTasks(tData.tasks);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [filterStatus]);

  async function onCreate(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        title,
        status,
      };
      if (dueDate) payload.dueDate = dueDate;
      if (courseId) payload.courseId = courseId;

      const data = await apiCreateTask(payload);
      setTasks((prev) => [data.task, ...prev]);
      setTitle("");
      setDueDate("");
      setStatus("todo");
      setCourseId("");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to create task");
    }
  }

  async function setTaskStatus(taskId, newStatus) {
    setError("");
    try {
      const data = await apiUpdateTask(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to update task");
    }
  }

  async function onDelete(taskId) {
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
      <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
        <h2>Tasks</h2>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <h3>Create task</h3>

          <form onSubmit={onCreate} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%" }} />
            </label>

            <label>
              Due date (optional)
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>

            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="todo">todo</option>
                <option value="doing">doing</option>
                <option value="done">done</option>
              </select>
            </label>

            <label>
              Course (optional)
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">— none —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit">Create</button>
          </form>

          {error && <div style={{ color: "crimson", marginTop: 10 }}>{error}</div>}
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Your tasks</h3>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, color: "#444" }}>Filter:</span>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">all</option>
                <option value="todo">todo</option>
                <option value="doing">doing</option>
                <option value="done">done</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ marginTop: 12 }}>Loading...</div>
          ) : tasks.length === 0 ? (
            <div style={{ marginTop: 12 }}>No tasks yet.</div>
          ) : (
            <ul style={{ paddingLeft: 18, marginTop: 12 }}>
              {tasks.map((t) => {
                const c = t.course_id ? courseMap.get(t.course_id) : null;
                return (
                  <li key={t.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ minWidth: 260 }}>
                        <b>{t.title}</b>
                        <div style={{ fontSize: 13, color: "#555" }}>
                          {t.due_date ? `Due: ${t.due_date}` : "No due date"}{" "}
                          {c ? `• Course: ${c.name}` : ""}
                        </div>
                      </div>

                      <select value={t.status} onChange={(e) => setTaskStatus(t.id, e.target.value)}>
                        <option value="todo">todo</option>
                        <option value="doing">doing</option>
                        <option value="done">done</option>
                      </select>

                      <button onClick={() => onDelete(t.id)} style={{ marginLeft: "auto" }}>
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
