import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiGetCourse, apiUpdateCourse, apiDeleteCourse } from "../api/courses.api";
import { apiCreateTask, apiListTasks, apiUpdateTask, apiDeleteTask } from "../api/tasks.api";
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
  const [midtermDate, setMidtermDate] = useState("");
  const [finalDate, setFinalDate] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);

  const imagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ""), [imageFile]);
  const bannerPreview = useMemo(() => (bannerFile ? URL.createObjectURL(bannerFile) : ""), [bannerFile]);

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
    setNotice("");
    setLoading(true);
    try {
      const [c, t, n] = await Promise.all([
        apiGetCourse(id),
        apiListTasks({ courseId: id }),
        apiListCourseNotes(id),
      ]);
      setCourse(c.course);
      setTasks(t.tasks);
      setNotes(n.notes);
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

  async function onCreateTask(e) {
    e.preventDefault();
    setError("");
    setNotice("");
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
            <Link to={`/tasks?courseId=${encodeURIComponent(id)}`}>Open tasks page →</Link>
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
                    {course.midterm_date ? <Pill>Midterm: {course.midterm_date}</Pill> : null}
                    {course.final_date ? <Pill>Final: {course.final_date}</Pill> : null}
                    {course.color ? <Pill>{course.color}</Pill> : null}
                  </div>
                </div>
              </div>
            </div>

            {error ? <div style={{ marginTop: 14, color: "crimson" }}>{error}</div> : null}
            {notice ? <div style={{ marginTop: 14, color: "#166534" }}>{notice}</div> : null}

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
                    <h3 style={{ marginTop: 0, marginBottom: 0 }}>Tasks</h3>
                    <span style={{ color: "#6b7280", fontSize: 14 }}>{tasks.length} total</span>
                  </div>

                  <form onSubmit={onCreateTask} style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New task title" />
                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 180px 160px" }}>
                      <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                        <option value="todo">To do</option>
                        <option value="doing">Doing</option>
                        <option value="done">Done</option>
                      </select>
                      <button type="submit">Add task</button>
                    </div>
                  </form>

                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    {tasks.length === 0 ? (
                      <div style={{ color: "#6b7280" }}>No tasks for this course yet.</div>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 14,
                            padding: 12,
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ fontWeight: 700 }}>{task.title}</div>
                            <button type="button" onClick={() => deleteTask(task.id)} style={{ color: "crimson" }}>
                              Delete
                            </button>
                          </div>
                          <div style={{ color: "#6b7280", fontSize: 14 }}>
                            Due {task.due_date || "—"} · Status {task.status}
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" onClick={() => setTaskStatus(task.id, "todo")}>To do</button>
                            <button type="button" onClick={() => setTaskStatus(task.id, "doing")}>Doing</button>
                            <button type="button" onClick={() => setTaskStatus(task.id, "done")}>Done</button>
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
                  <button onClick={onDeleteCourse} style={{ color: "crimson" }}>
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

                  <button type="submit">Save course</button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 14 }}>Course not found.</div>
        )}
      </div>
    </>
  );
}
