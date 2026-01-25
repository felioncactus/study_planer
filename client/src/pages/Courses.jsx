import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { apiCreateCourse, apiDeleteCourse, apiListCourses } from "../api/courses.api";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtTime(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

function formatTimeRange(start, end) {
  if (!start && !end) return "";
  if (start && end) return `${fmtTime(start)}–${fmtTime(end)}`;
  return start ? `${fmtTime(start)}` : `${fmtTime(end)}`;
}

function ymdToLabel(ymd) {
  if (!ymd) return "";
  return ymd;
}

export default function Courses() {
  const [courses, setCourses] = useState([]);

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

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const imagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ""), [imageFile]);
  const bannerPreview = useMemo(() => (bannerFile ? URL.createObjectURL(bannerFile) : ""), [bannerFile]);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const data = await apiListCourses();
      setCourses(data.courses);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setError("");

    try {
      const fd = new FormData();
      fd.append("name", name);
      if (color) fd.append("color", color);
      if (description) fd.append("description", description);
      if (dayOfWeek) fd.append("dayOfWeek", dayOfWeek);
      if (startTime) fd.append("startTime", startTime);
      if (endTime) fd.append("endTime", endTime);
      if (midtermDate) fd.append("midtermDate", midtermDate);
      if (finalDate) fd.append("finalDate", finalDate);
      if (imageFile) fd.append("image", imageFile);
      if (bannerFile) fd.append("banner", bannerFile);

      await apiCreateCourse(fd);

      setName("");
      setDescription("");
      setDayOfWeek("");
      setStartTime("");
      setEndTime("");
      setMidtermDate("");
      setFinalDate("");
      setImageFile(null);
      setBannerFile(null);

      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to create course");
    }
  }

  async function onDelete(id) {
    setError("");
    try {
      await apiDeleteCourse(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to delete course");
    }
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Courses</h2>
          <Link to="/tasks" style={{ fontSize: 14 }}>
            View all tasks →
          </Link>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 14, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Create course</h3>

          <form onSubmit={onCreate} style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
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
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
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
                Midterm
                <input type="date" value={midtermDate} onChange={(e) => setMidtermDate(e.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                Final
                <input type="date" value={finalDate} onChange={(e) => setFinalDate(e.target.value)} />
              </label>
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <label style={{ display: "grid", gap: 6 }}>
                Course image (square)
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="course preview"
                    style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", border: "1px solid #eee" }}
                  />
                ) : null}
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                Banner (horizontal, like Twitter/LinkedIn)
                <input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
                {bannerPreview ? (
                  <img
                    src={bannerPreview}
                    alt="banner preview"
                    style={{ width: "100%", height: 72, borderRadius: 12, objectFit: "cover", border: "1px solid #eee" }}
                  />
                ) : null}
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button type="submit" disabled={!name.trim()}>
                Create
              </button>
              <div style={{ fontSize: 12, color: "#666" }}>
                Tip: Upload a banner for the course page header.
              </div>
            </div>
          </form>

          {error && <div style={{ color: "crimson", marginTop: 10 }}>{error}</div>}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Your courses</h3>

          {loading ? (
            <div>Loading...</div>
          ) : courses.length === 0 ? (
            <div>No courses yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {courses.map((c) => {
                const timeRange = formatTimeRange(c.start_time, c.end_time);
                const metaParts = [
                  c.day_of_week ? `${c.day_of_week}${timeRange ? " " : ""}` : "",
                  timeRange,
                  c.midterm_date ? `Midterm: ${ymdToLabel(c.midterm_date)}` : "",
                  c.final_date ? `Final: ${ymdToLabel(c.final_date)}` : "",
                ].filter(Boolean);

                return (
                  <div
                    key={c.id}
                    style={{
                      border: "1px solid #e7e7e7",
                      borderRadius: 16,
                      overflow: "hidden",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        height: 84,
                        backgroundImage: c.banner_url ? `url(${c.banner_url})` : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundColor: c.banner_url ? undefined : "#f3f4f6",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 14,
                          bottom: -22,
                          width: 56,
                          height: 56,
                          borderRadius: 18,
                          border: "3px solid white",
                          overflow: "hidden",
                          background: c.color || "#e5e7eb",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontWeight: 800, color: "#111" }}>{(c.name || "?").slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: "34px 14px 12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Link to={`/courses/${c.id}`} style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>
                            {c.name}
                          </Link>
                          {c.color ? (
                            <span
                              title={c.color}
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                background: c.color,
                                border: "1px solid #ddd",
                              }}
                            />
                          ) : null}
                        </div>

                        {c.description ? (
                          <div style={{ marginTop: 6, color: "#444", fontSize: 13, whiteSpace: "pre-wrap" }}>{c.description}</div>
                        ) : null}

                        {metaParts.length ? (
                          <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>{metaParts.join(" • ")}</div>
                        ) : null}
                      </div>

                      <button onClick={() => onDelete(c.id)} style={{ marginLeft: "auto" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
