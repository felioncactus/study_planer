import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import TaskPlannerModal from "../components/TaskPlannerModal";
import { apiListCourses } from "../api/courses.api";
import {
  apiCreateTask,
  apiDeleteTask,
  apiEstimateTaskDuration,
  apiListTasks,
  apiTaskSuggestions,
  apiUpdateTask,
  apiUploadTaskAttachments,
} from "../api/tasks.api";

function statusTone(status) {
  if (status === "done") return "success";
  if (status === "doing") return "warning";
  return "neutral";
}

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

  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateNotes, setEstimateNotes] = useState("");

  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerStudyWindow, setPlannerStudyWindow] = useState({
    start: "18:00",
    end: "22:00",
  });
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerData, setPlannerData] = useState(null);
  const [pendingPayload, setPendingPayload] = useState(null);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const courseMap = useMemo(() => {
    const map = new Map();
    for (const course of courses) map.set(course.id, course);
    return map;
  }, [courses]);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const qCourse = qs.get("courseId") || "";
    const wantsCreate = qs.get("create") === "1";

    setFilterCourseId(qCourse);
    if (qCourse) setCourseId(qCourse);

    if (wantsCreate) {
      requestAnimationFrame(() => {
        const form = document.getElementById("task-create-form");
        if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.search]);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const filters = {};
      if (filterStatus) filters.status = filterStatus;
      if (filterCourseId) filters.courseId = filterCourseId;

      const [cData, tData] = await Promise.all([
        apiListCourses(),
        apiListTasks(filters),
      ]);
      setCourses(cData.courses || []);
      setTasks(tData.tasks || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [filterStatus, filterCourseId]);

  async function onCreate(e) {
    e.preventDefault();
    setError("");

    const payload = {
      title: title.trim(),
      status,
      estimatedMinutes: Number(estimatedMinutes) || 60,
      priority: Number(priority) || 3,
      splittable: !!splittable,
    };

    if (description.trim()) payload.description = description.trim();
    if (dueDate) payload.dueDate = dueDate;
    if (courseId) payload.courseId = courseId;

    setPendingPayload(payload);

    setPlannerLoading(true);
    try {
      const data = await apiTaskSuggestions({
        dueDate: payload.dueDate || null,
        estimatedMinutes: payload.estimatedMinutes,
        studyWindow: plannerStudyWindow,
      });
      setPlannerData(data.suggestions);
      if (data?.suggestions?.studyWindow)
        setPlannerStudyWindow(data.suggestions.studyWindow);
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
      if (picked?.blocks?.length) {
        payload.plannedBlocks = picked.blocks;
        payload.plannedSource = "ai";
      } else if (picked?.start && picked?.end) {
        payload.plannedStartAt = picked.start;
        payload.plannedEndAt = picked.end;
      }

      const data = await apiCreateTask(payload);

      if (newFiles.length) {
        try {
          await apiUploadTaskAttachments(data.task.id, newFiles);
        } catch {
          // keep task creation successful even if attachment upload fails
        }
      }

      setPlannerOpen(false);
      setPlannerData(null);
      setPendingPayload(null);

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

  async function setTaskStatus(taskId, nextStatus) {
    setError("");
    try {
      const data = await apiUpdateTask(taskId, { status: nextStatus });
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? data.task : task)),
      );
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to update task");
    }
  }

  async function onDelete(taskId) {
    setError("");
    try {
      await apiDeleteTask(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to delete task");
    }
  }

  async function estimateMinutesWithAI() {
    setEstimateNotes("");
    setError("");
    try {
      setEstimateLoading(true);
      const data = await apiEstimateTaskDuration({ title, description });
      const estimated = data?.estimate?.estimatedMinutes;
      if (typeof estimated === "number") setEstimatedMinutes(estimated);
      if (data?.estimate?.notes) setEstimateNotes(data.estimate.notes);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message || "Failed to estimate time",
      );
    } finally {
      setEstimateLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="container stack" style={{ marginTop: 18 }}>
        <div className="page-header">
          <div>
            <div className="title">Tasks</div>
            <div className="small muted">
              Create, plan, and finish tasks without leaving stale blocks on the
              calendar.
            </div>
          </div>
          <Link to="/courses" className="btn btn-ghost">
            Go to courses
          </Link>
        </div>

        {error ? <div className="notice notice-danger">{error}</div> : null}

        <div className="card">
          <div className="section-title">Create task</div>
          <form
            onSubmit={onCreate}
            className="form-grid"
            style={{ marginTop: 12 }}
          >
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>

            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Add details, links, notes..."
              />
            </label>

            <label>
              Attachments
              <input
                ref={fileInputRef}
                id="attachments"
                type="file"
                multiple
                onChange={(e) => setNewFiles(Array.from(e.target.files || []))}
                style={{ display: "none" }}
              />
              <label
                htmlFor="attachments"
                className="btn btn-ghost"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  backgroundColor: "#f9f9f9",
                  cursor: "pointer",
                }}
              >
                Choose files
              </label>
              {newFiles.length ? (
                <div className="small muted">
                  Selected: {newFiles.map((file) => file.name).join(", ")}
                </div>
              ) : null}
            </label>

            <div className="two-col three-col-on-desktop">
              <label>
                Due date
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </label>

              <label>
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="todo">todo</option>
                  <option value="doing">doing</option>
                  <option value="done">done</option>
                </select>
              </label>

              <label>
                Course
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                >
                  <option value="">(none)</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="two-col three-col-on-desktop">
              <label>
                Estimated minutes
                <div className="row" style={{ alignItems: "stretch" }}>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={estimateMinutesWithAI}
                    disabled={
                      estimateLoading || (!title.trim() && !description.trim())
                    }
                  >
                    {estimateLoading ? "Estimating..." : "Estimate with AI"}
                  </button>
                </div>
                {estimateNotes ? (
                  <div className="small muted">{estimateNotes}</div>
                ) : null}
              </label>

              <label>
                Priority (1–5)
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
              </label>

              <label>
                Splittable
                <select
                  value={splittable ? "yes" : "no"}
                  onChange={(e) => setSplittable(e.target.value === "yes")}
                >
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                </select>
              </label>
            </div>

            {plannerLoading ? (
              <div className="small muted">Loading planner…</div>
            ) : null}

            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!title.trim()}
              >
                Plan task
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="page-header" style={{ margin: 0 }}>
            <div>
              <div className="section-title">Your tasks</div>
              <div className="small muted">
                {tasks.length} task{tasks.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="row">
              <label className="small muted" style={{ minWidth: 120 }}>
                Status
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="todo">todo</option>
                  <option value="doing">doing</option>
                  <option value="done">done</option>
                </select>
              </label>

              <label className="small muted" style={{ minWidth: 160 }}>
                Course
                <select
                  value={filterCourseId}
                  onChange={(e) => setFilterCourseId(e.target.value)}
                >
                  <option value="">All</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="small muted" style={{ marginTop: 12 }}>
              Loading...
            </div>
          ) : tasks.length === 0 ? (
            <div className="small muted" style={{ marginTop: 12 }}>
              No tasks found.
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 12 }}>
              {tasks.map((task) => {
                const course = task.course_id
                  ? courseMap.get(task.course_id)
                  : null;
                return (
                  <div key={task.id} className="task-item">
                    <div style={{ minWidth: 0 }}>
                      <div className="task-item-title">
                        <Link to={`/tasks/${task.id}`} className="stealth-link">
                          {task.title}
                        </Link>
                      </div>
                      <div className="small muted" style={{ marginTop: 4 }}>
                        {task.due_date ? `Due: ${task.due_date} • ` : ""}
                        Status:{" "}
                        <span
                          className={`status-pill ${statusTone(task.status)}`}
                        >
                          {task.status}
                        </span>
                        {course ? (
                          <>
                            {" • "}
                            <Link to={`/courses/${course.id}`}>
                              {course.name}
                            </Link>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="task-actions">
                      {task.status !== "todo" ? (
                        <button
                          className="btn btn-ghost"
                          onClick={() => setTaskStatus(task.id, "todo")}
                        >
                          todo
                        </button>
                      ) : null}
                      {task.status !== "doing" ? (
                        <button
                          className="btn btn-ghost"
                          onClick={() => setTaskStatus(task.id, "doing")}
                        >
                          doing
                        </button>
                      ) : null}
                      {task.status !== "done" ? (
                        <button
                          className="btn"
                          onClick={() => setTaskStatus(task.id, "done")}
                        >
                          done
                        </button>
                      ) : null}
                      <button
                        className="btn btn-danger"
                        onClick={() => onDelete(task.id)}
                      >
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
        taskTitle={pendingPayload?.title ?? title}
        taskDescription={pendingPayload?.description ?? description}
        taskDueDate={(pendingPayload?.dueDate ?? dueDate) || null}
        taskEstimatedMinutes={
          Number(pendingPayload?.estimatedMinutes ?? estimatedMinutes) || 60
        }
        suggestions={plannerData}
        loading={plannerLoading}
        currentStudyWindow={plannerStudyWindow}
        onStudyWindowChange={async (windowValue) => {
          setPlannerStudyWindow(windowValue);
          setPlannerLoading(true);
          setError("");
          try {
            const data = await apiTaskSuggestions({
              dueDate: (pendingPayload?.dueDate ?? dueDate) || null,
              estimatedMinutes:
                Number(pendingPayload?.estimatedMinutes ?? estimatedMinutes) ||
                60,
              studyWindow: windowValue,
            });
            setPlannerData(data.suggestions);
          } catch (err) {
            setError(
              err?.response?.data?.error?.message || "Failed to update planner",
            );
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
