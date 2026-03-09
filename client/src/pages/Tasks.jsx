import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import TaskPlannerModal from "../components/TaskPlannerModal";
import { apiListCourses } from "../api/courses.api";
import { apiCreateTask, apiDeleteTask, apiListTasks, apiUpdateTask, apiUploadTaskAttachments, apiTaskSuggestions } from "../api/tasks.api";
import { useLocation, Link } from "react-router-dom";
export default function Tasks() {
  const location = useLocation();

  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("Homework 1");
  const [description, setDescription] = useState("");
  const [newFiles, setNewFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("todo");
  const [courseId, setCourseId] = useState("");

  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [priority, setPriority] = useState(3);
  const [splittable, setSplittable] = useState(true);

  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerStudyWindow, setPlannerStudyWindow] = useState({ start: "18:00", end: "22:00" });
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerData, setPlannerData] = useState(null);
  const [pendingPayload, setPendingPayload] = useState(null);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const courseMap = useMemo(() => {
    const m = new Map();
    for (const c of courses) m.set(c.id, c);
    return m;
  }, [courses]);

  useEffect(() => {
    // support deep-link: /tasks?courseId=<uuid>
    const qs = new URLSearchParams(location.search);
    const qCourse = qs.get("courseId") || "";
    if (qCourse) setFilterCourseId(qCourse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const filters = {};
      if (filterStatus) filters.status = filterStatus;
      if (filterCourseId) filters.courseId = filterCourseId;

      const [cData, tData] = await Promise.all([apiListCourses(), apiListTasks(filters)]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterCourseId]);

    async function onCreate(e) {
    e.preventDefault();
    setError("");

    const payload = { title, status, estimatedMinutes: Number(estimatedMinutes) || 60, priority: Number(priority) || 3, splittable: !!splittable };
    if (description.trim()) payload.description = description.trim();
    if (dueDate) payload.dueDate = dueDate;
    if (courseId) payload.courseId = courseId;

    setPendingPayload(payload);

    setPlannerLoading(true);
    try {
      const d = await apiTaskSuggestions({
        dueDate: payload.dueDate || null,
        estimatedMinutes: payload.estimatedMinutes,
        studyWindow: plannerStudyWindow,
      });
      setPlannerData(d.suggestions);
      if (d?.suggestions?.studyWindow) setPlannerStudyWindow(d.suggestions.studyWindow);
      setPlannerOpen(true);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load planner");
    } finally {
      setPlannerLoading(false);
    }
  }

  async function createTaskWithPickedSlot(picked) {
    setError("");
    try {
      const payload = { ...(pendingPayload || {}) };
      if (picked?.start && picked?.end) {
        payload.plannedStartAt = picked.start;
        payload.plannedEndAt = picked.end;
      }

      const data = await apiCreateTask(payload);

      // If user selected attachments, upload them after the task is created.
      if (newFiles.length) {
        try {
          await apiUploadTaskAttachments(data.task.id, newFiles);
        } catch {
          // ignore attachment errors (task already created)
        }
      }

      setPlannerOpen(false);
      setPlannerData(null);
      setPendingPayload(null);

      // reset form
      setTitle("Homework 1");
      setDescription("");
      setDueDate("");
      setStatus("todo");
      setCourseId("");
      setEstimatedMinutes(60);
      setPriority(3);
      setSplittable(true);
      setNewFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to create task");
    }
  }

  async function onDelete(id) {
    setError("");
    try {
      await apiDeleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to delete task");
    }
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Tasks</h2>
          <Link to="/courses" style={{ fontSize: 14 }}>
            Go to courses →
          </Link>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 14, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Create task</h3>
          <form onSubmit={onCreate} style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%" }} />
            </label>

<label style={{ display: "grid", gap: 6 }}>
  Description (optional)
  <textarea
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    rows={5}
    placeholder="Add details, links, notes..."
    style={{ width: "100%", resize: "vertical" }}
  />
</label>

<label style={{ display: "grid", gap: 6 }}>
  Attachments (optional)
  <input
    ref={fileInputRef}
    type="file"
    multiple
    onChange={(e) => setNewFiles(Array.from(e.target.files || []))}
  />
  {newFiles.length ? (
    <div style={{ fontSize: 12, color: "#6b7280" }}>
      Selected: {newFiles.map((f) => f.name).join(", ")}
    </div>
  ) : null}
</label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                Due date
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="todo">todo</option>
                  <option value="doing">doing</option>
                  <option value="done">done</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                Course (optional)
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  <option value="">(none)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                Estimated minutes
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                Priority (1–5)
                <input type="number" min="1" max="5" value={priority} onChange={(e) => setPriority(e.target.value)} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                Splittable
                <select value={splittable ? "yes" : "no"} onChange={(e) => setSplittable(e.target.value === "yes")}>
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                </select>
              </label>
            </div>

            {plannerLoading ? <div className="small muted">Loading planner…</div> : null}

            <button type="submit" disabled={!title.trim()}>
              Create
            </button>
          </form>

          {error && <div style={{ color: "crimson", marginTop: 10 }}>{error}</div>}
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Your tasks</h3>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                Status
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="todo">todo</option>
                  <option value="doing">doing</option>
                  <option value="done">done</option>
                </select>
              </label>

              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                Course
                <select value={filterCourseId} onChange={(e) => setFilterCourseId(e.target.value)}>
                  <option value="">All</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div style={{ marginTop: 12 }}>Loading...</div>
          ) : tasks.length === 0 ? (
            <div style={{ marginTop: 12, color: "#666" }}>No tasks found.</div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {tasks.map((t) => {
                const course = t.course_id ? courseMap.get(t.course_id) : null;
                return (
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
                      <div style={{ fontWeight: 800, color: "#111" }}><Link to={`/tasks/${t.id}`} style={{ color: "inherit", textDecoration: "none" }}>{t.title}</Link></div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                        {t.due_date ? `Due: ${t.due_date} • ` : ""}
                        Status: {t.status}
                        {course ? (
                          <>
                            {" • "}
                            <Link to={`/courses/${course.id}`}>{course.name}</Link>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {t.status !== "todo" ? <button onClick={() => setTaskStatus(t.id, "todo")}>todo</button> : null}
                      {t.status !== "doing" ? <button onClick={() => setTaskStatus(t.id, "doing")}>doing</button> : null}
                      {t.status !== "done" ? <button onClick={() => setTaskStatus(t.id, "done")}>done</button> : null}
                      <button onClick={() => onDelete(t.id)} style={{ color: "crimson" }}>
                        delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <TaskPlannerModal
        open={plannerOpen}
        suggestions={plannerData}
        loading={plannerLoading}
        currentStudyWindow={plannerStudyWindow}
        onStudyWindowChange={async (win) => {
          setPlannerStudyWindow(win);
          setPlannerLoading(true);
          setError("");
          try {
            const d = await apiTaskSuggestions({
              dueDate: (pendingPayload?.dueDate ?? dueDate) || null,
              estimatedMinutes: Number(pendingPayload?.estimatedMinutes ?? estimatedMinutes) || 60,
              studyWindow: win,
            });
            setPlannerData(d.suggestions);
          } catch (err) {
            setError(err?.response?.data?.error?.message || "Failed to update planner");
          } finally {
            setPlannerLoading(false);
          }
        }}
        onClose={() => {
          setPlannerOpen(false);
          setPlannerData(null);
        }}
        onConfirm={createTaskWithPickedSlot}
      />
    </>
  );
}
