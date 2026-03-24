import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import TaskPlannerModal from "../components/TaskPlannerModal";
import { apiGetCourse, apiUpdateCourse, apiDeleteCourse } from "../api/courses.api";
import {
  apiCreateTask,
  apiDeleteTask,
  apiEstimateTaskDuration,
  apiListTasks,
  apiTaskSuggestions,
  apiUpdateTask,
  apiUploadTaskAttachments,
} from "../api/tasks.api";
import { apiListCourseNotes, apiCreateCourseNote } from "../api/notes.api";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtTime(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

function fmtDateOnly(d) {
  if (!d) return "";
  return String(d).slice(0, 10);
}

function formatTimeRange(start, end) {
  if (!start && !end) return "";
  if (start && end) return `${fmtTime(start)}–${fmtTime(end)}`;
  return start ? `${fmtTime(start)}` : `${fmtTime(end)}`;
}

function formatStamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusTone(status) {
  if (status === "done") return "success";
  if (status === "doing") return "warning";
  return "neutral";
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
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [course, setCourse] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingNote, setCreatingNote] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [description, setDescription] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [beginsOn, setBeginsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [midtermDate, setMidtermDate] = useState("");
  const [finalDate, setFinalDate] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("Homework 1");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskFiles, setTaskFiles] = useState([]);
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskStatus, setTaskStatus] = useState("todo");
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [priority, setPriority] = useState(3);
  const [splittable, setSplittable] = useState(true);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateNotes, setEstimateNotes] = useState("");
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerStudyWindow, setPlannerStudyWindow] = useState({
    start: "18:00",
    end: "22:00",
  });
  const [plannerData, setPlannerData] = useState(null);
  const [pendingTaskPayload, setPendingTaskPayload] = useState(null);

  const imagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ""), [imageFile]);
  const bannerPreview = useMemo(() => (bannerFile ? URL.createObjectURL(bannerFile) : ""), [bannerFile]);

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
    setNotice("");
    setLoading(true);
    try {
      const [c, t, n] = await Promise.all([
        apiGetCourse(id),
        apiListTasks({ courseId: id }),
        apiListCourseNotes(id),
      ]);
      setCourse(c.course);
      setTasks(t.tasks || []);
      setNotes(n.notes || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!course) return;
    setName(course.name || "");
    setColor(course.color || "#2563eb");
    setDescription(course.description || "");
    setDayOfWeek(course.day_of_week || "");
    setStartTime(fmtTime(course.start_time));
    setEndTime(fmtTime(course.end_time));
    setBeginsOn(fmtDateOnly(course.begins_on));
    setEndsOn(fmtDateOnly(course.ends_on));
    setMidtermDate(fmtDateOnly(course.midterm_date));
    setFinalDate(fmtDateOnly(course.final_date));
    setImageFile(null);
    setBannerFile(null);
    setRemoveImage(false);
    setRemoveBanner(false);
  }, [course?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [imagePreview, bannerPreview]);

  async function onSaveSettings(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("color", color || "");
      fd.append("description", description || "");
      fd.append("dayOfWeek", dayOfWeek || "");
      fd.append("startTime", startTime || "");
      fd.append("endTime", endTime || "");
      fd.append("beginsOn", fmtDateOnly(beginsOn) || "");
      fd.append("endsOn", fmtDateOnly(endsOn) || "");
      fd.append("midtermDate", fmtDateOnly(midtermDate) || "");
      fd.append("finalDate", fmtDateOnly(finalDate) || "");
      if (imageFile) fd.append("image", imageFile);
      else if (removeImage) fd.append("imageUrl", "");
      if (bannerFile) fd.append("banner", bannerFile);
      else if (removeBanner) fd.append("bannerUrl", "");

      const data = await apiUpdateCourse(id, fd);
      setCourse(data.course);
      setNotice("Saved.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to save course");
    }
  }

  async function onDeleteCourse() {
    const ok = window.confirm("Delete this course? Tasks will stay but become detached from the course.");
    if (!ok) return;
    try {
      await apiDeleteCourse(id);
      navigate("/courses");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to delete course");
    }
  }

  async function onPlanTask(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    const payload = {
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      status: taskStatus,
      courseId: id,
      dueDate: taskDueDate || undefined,
      estimatedMinutes: Number(estimatedMinutes) || 60,
      priority: Number(priority) || 3,
      splittable: !!splittable,
    };

    setPendingTaskPayload(payload);
    setPlannerLoading(true);
    try {
      const data = await apiTaskSuggestions({
        dueDate: payload.dueDate || null,
        estimatedMinutes: payload.estimatedMinutes,
        studyWindow: plannerStudyWindow,
      });
      setPlannerData(data.suggestions);
      if (data?.suggestions?.studyWindow) {
        setPlannerStudyWindow(data.suggestions.studyWindow);
      }
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
      const payload = { ...(pendingTaskPayload || {}) };
      if (picked?.blocks?.length) {
        payload.plannedBlocks = picked.blocks;
        payload.plannedSource = "ai";
      } else if (picked?.start && picked?.end) {
        payload.plannedStartAt = picked.start;
        payload.plannedEndAt = picked.end;
      }

      const data = await apiCreateTask(payload);

      if (taskFiles.length) {
        try {
          await apiUploadTaskAttachments(data.task.id, taskFiles);
        } catch {
          // keep task creation successful even if attachment upload fails
        }
      }

      setTasks((prev) => [data.task, ...prev]);
      setPlannerOpen(false);
      setPlannerData(null);
      setPendingTaskPayload(null);
      setCreateTaskOpen(false);
      setTaskTitle("Homework 1");
      setTaskDescription("");
      setTaskFiles([]);
      setTaskDueDate("");
      setTaskStatus("todo");
      setEstimatedMinutes(60);
      setPriority(3);
      setSplittable(true);
      setEstimateNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice("Task created.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to create task");
    }
  }

  async function estimateMinutesWithAI() {
    setEstimateNotes("");
    setError("");
    try {
      setEstimateLoading(true);
      const data = await apiEstimateTaskDuration({
        title: taskTitle,
        description: taskDescription,
      });
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

  async function setExistingTaskStatus(taskId, status) {
    try {
      const data = await apiUpdateTask(taskId, { status });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to update task");
    }
  }

  async function deleteTask(taskId) {
    try {
      await apiDeleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to delete task");
    }
  }

  async function startLessonNote() {
    setCreatingNote(true);
    setError("");
    try {
      const dateLabel = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date());
      const data = await apiCreateCourseNote(id, {
        title: `${course?.name || "Lesson"} notes — ${dateLabel}`,
        contentHtml: `<h2>${course?.name || "Lesson"} notes</h2><p>Start writing here…</p>`,
      });
      navigate(`/notes/${data.note.id}`);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to start note");
    } finally {
      setCreatingNote(false);
    }
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Link to="/courses">← Back to courses</Link>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/tasks?courseId=${id}&create=1`)}
            >
              Create task
            </button>
            <button type="button" onClick={startLessonNote} disabled={creatingNote}>
              {creatingNote ? "Opening…" : "Start lesson / note"}
            </button>
          </div>
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
                    {course.begins_on ? <Pill>Begins: {course.begins_on}</Pill> : null}
                    {course.ends_on ? <Pill>Ends: {course.ends_on}</Pill> : null}
                    {course.midterm_date ? <Pill>Midterm: {course.midterm_date}</Pill> : null}
                    {course.final_date ? <Pill>Final: {course.final_date}</Pill> : null}
                    {course.color ? <Pill>{course.color}</Pill> : null}
                  </div>
                </div>
              </div>
            </div>

            {error ? <div className="notice notice-danger" style={{ marginTop: 14 }}>{error}</div> : null}
            {notice ? <div className="notice notice-success" style={{ marginTop: 14 }}>{notice}</div> : null}

            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, marginTop: 16 }}>
              <div style={{ display: "grid", gap: 16 }}>
                {course.description ? (
                  <div className="card">
                    <h3 style={{ marginTop: 0 }}>Description</h3>
                    <div style={{ whiteSpace: "pre-wrap", color: "#374151" }}>{course.description}</div>
                  </div>
                ) : null}

                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Course notes</h3>
                      <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
                        Rich text notes with an AI study assistant and PDF export.
                      </div>
                    </div>
                    <button type="button" onClick={startLessonNote} disabled={creatingNote}>
                      {creatingNote ? "Opening…" : "New note"}
                    </button>
                  </div>

                  {notes.length === 0 ? (
                    <div style={{ color: "#6b7280" }}>No notes yet. Start a lesson to create your first one.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {notes.map((note) => (
                        <Link
                          key={note.id}
                          to={`/notes/${note.id}`}
                          style={{
                            display: "grid",
                            gap: 4,
                            padding: 14,
                            border: "1px solid #e5e7eb",
                            borderRadius: 14,
                            textDecoration: "none",
                            color: "inherit",
                            background: "#fff",
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>{note.title}</div>
                          <div style={{ fontSize: 13, color: "#6b7280" }}>
                            Created {formatStamp(note.created_at)} · Edited {formatStamp(note.updated_at)}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <h3 style={{ marginTop: 0, marginBottom: 0 }}>Tasks</h3>
                      <div className="small muted" style={{ marginTop: 4 }}>
                        Create and plan tasks here for this course.
                      </div>
                    </div>
                    <span style={{ color: "#6b7280", fontSize: 14 }}>{tasks.length} total</span>
                  </div>

                  {createTaskOpen ? (
                    <form
                      onSubmit={onPlanTask}
                      className="form-grid"
                      style={{ marginTop: 12 }}
                    >
                      <label>
                        Title
                        <input
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                        />
                      </label>

                      <label>
                        Description
                        <textarea
                          value={taskDescription}
                          onChange={(e) => setTaskDescription(e.target.value)}
                          rows={5}
                          placeholder="Add details, links, notes..."
                        />
                      </label>

                      <label>
                        Attachments
                        <input
                          ref={fileInputRef}
                          id="course-task-attachments"
                          type="file"
                          multiple
                          onChange={(e) => setTaskFiles(Array.from(e.target.files || []))}
                          style={{ display: "none" }}
                        />
                        <label
                          htmlFor="course-task-attachments"
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
                        {taskFiles.length ? (
                          <div className="small muted">
                            Selected: {taskFiles.map((file) => file.name).join(", ")}
                          </div>
                        ) : null}
                      </label>

                      <div className="two-col three-col-on-desktop">
                        <label>
                          Due date
                          <input
                            type="date"
                            value={taskDueDate}
                            onChange={(e) => setTaskDueDate(e.target.value)}
                          />
                        </label>

                        <label>
                          Status
                          <select
                            value={taskStatus}
                            onChange={(e) => setTaskStatus(e.target.value)}
                          >
                            <option value="todo">todo</option>
                            <option value="doing">doing</option>
                            <option value="done">done</option>
                          </select>
                        </label>

                        <label>
                          Course
                          <input value={course.name || ""} disabled />
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
                                estimateLoading ||
                                (!taskTitle.trim() && !taskDescription.trim())
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
                          disabled={!taskTitle.trim()}
                        >
                          Plan task
                        </button>
                      </div>
                    </form>
                  ) : null}

                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    {tasks.length === 0 ? (
                      <div style={{ color: "#6b7280" }}>No tasks for this course yet.</div>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          className="card"
                          style={{ padding: 12, display: "grid", gap: 8 }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ minWidth: 0 }}>
                              <Link
                                to={`/tasks/${task.id}`}
                                style={{
                                  fontWeight: 800,
                                  color: "inherit",
                                  textDecoration: "none",
                                }}
                              >
                                {task.title}
                              </Link>
                              <div className="small muted" style={{ marginTop: 4 }}>
                                Due {task.due_date || "—"} · Status {task.status}
                              </div>
                            </div>
                            <span className={`status-badge ${statusTone(task.status)}`}>
                              {task.status}
                            </span>
                          </div>

                          {task.description ? (
                            <div className="small muted" style={{ whiteSpace: "pre-wrap" }}>
                              {task.description}
                            </div>
                          ) : null}

                          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                            <button className="btn" type="button" onClick={() => setExistingTaskStatus(task.id, "todo")}>
                              todo
                            </button>
                            <button className="btn" type="button" onClick={() => setExistingTaskStatus(task.id, "doing")}>
                              doing
                            </button>
                            <button className="btn" type="button" onClick={() => setExistingTaskStatus(task.id, "done")}>
                              done
                            </button>
                            <button className="btn btn-danger" type="button" onClick={() => deleteTask(task.id)}>
                              delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 0 }}>Basic settings</h3>
                  <button onClick={onDeleteCourse} className="btn btn-danger">
                    Delete course
                  </button>
                </div>

                <form onSubmit={onSaveSettings} style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    Name
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="CS101" />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    Color
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                      <code style={{ fontSize: 12 }}>{color}</code>
                      <span style={{ width: 14, height: 14, borderRadius: 999, background: color, border: "1px solid #ddd" }} />
                    </div>
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    Description
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="What is this course about?"
                    />
                  </label>

                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr" }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      Day
                      <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                        <option value="">(optional)</option>
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      Start time
                      <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      End time
                      <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </label>
                  </div>

                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      Course begins
                      <input type="date" value={beginsOn} onChange={(e) => setBeginsOn(e.target.value)} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      Course ends
                      <input type="date" min={beginsOn || undefined} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
                    </label>
                  </div>

                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      Midterm date
                      <input type="date" value={midtermDate} onChange={(e) => setMidtermDate(e.target.value)} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      Final date
                      <input type="date" value={finalDate} onChange={(e) => setFinalDate(e.target.value)} />
                    </label>
                  </div>

                  <label style={{ display: "grid", gap: 6 }}>
                    Course image
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                  </label>
                  {(imagePreview || course.image_url) ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <img
                        src={imagePreview || course.image_url}
                        alt="Course"
                        style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 14, border: "1px solid #e5e7eb" }}
                      />
                      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
                        Remove image
                      </label>
                    </div>
                  ) : null}

                  <label style={{ display: "grid", gap: 6 }}>
                    Banner image
                    <input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
                  </label>
                  {(bannerPreview || course.banner_url) ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <img
                        src={bannerPreview || course.banner_url}
                        alt="Banner"
                        style={{ width: "100%", maxWidth: 360, height: 120, objectFit: "cover", borderRadius: 14, border: "1px solid #e5e7eb" }}
                      />
                      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="checkbox" checked={removeBanner} onChange={(e) => setRemoveBanner(e.target.checked)} />
                        Remove banner
                      </label>
                    </div>
                  ) : null}

                  <button type="submit" className="btn btn-primary">Save course</button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 14 }}>Course not found.</div>
        )}
      </div>

      <TaskPlannerModal
        open={plannerOpen}
        taskTitle={pendingTaskPayload?.title ?? taskTitle}
        taskDescription={pendingTaskPayload?.description ?? taskDescription}
        taskDueDate={(pendingTaskPayload?.dueDate ?? taskDueDate) || null}
        taskEstimatedMinutes={
          Number(pendingTaskPayload?.estimatedMinutes ?? estimatedMinutes) || 60
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
              dueDate: (pendingTaskPayload?.dueDate ?? taskDueDate) || null,
              estimatedMinutes:
                Number(pendingTaskPayload?.estimatedMinutes ?? estimatedMinutes) ||
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
