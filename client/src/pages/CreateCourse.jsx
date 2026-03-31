import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import RoundTimePicker from "../components/RoundTimePicker";
import { apiCreateCourse } from "../api/courses.api";

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CreateCourse() {
  const navigate = useNavigate();

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const imagePreview = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : ""),
    [imageFile],
  );
  const bannerPreview = useMemo(
    () => (bannerFile ? URL.createObjectURL(bannerFile) : ""),
    [bannerFile],
  );

  async function onCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const fd = new FormData();
      fd.append("name", name);
      if (color) fd.append("color", color);
      if (description) fd.append("description", description);
      if (dayOfWeek) fd.append("dayOfWeek", dayOfWeek);
      if (startTime) fd.append("startTime", startTime);
      if (endTime) fd.append("endTime", endTime);
      if (beginsOn) fd.append("beginsOn", dateOnly(beginsOn));
      if (endsOn) fd.append("endsOn", dateOnly(endsOn));
      if (midtermDate) fd.append("midtermDate", dateOnly(midtermDate));
      if (finalDate) fd.append("finalDate", dateOnly(finalDate));
      if (imageFile) fd.append("image", imageFile);
      if (bannerFile) fd.append("banner", bannerFile);

      const data = await apiCreateCourse(fd);
      navigate(`/courses/${data.course.id}`);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message || "Failed to create course",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
        <div className="page-header">
          <div>
            <div className="title">Create course</div>
            <div className="small muted">
              Use the same course setup flow, now on its own page.
            </div>
          </div>
          <Link to="/courses" className="btn btn-ghost">
            Back to courses
          </Link>
        </div>

        {error ? <div className="notice notice-danger">{error}</div> : null}

        <div className="card">
          <form onSubmit={onCreate} style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="CS101"
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                Color
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                  <code style={{ fontSize: 12 }}>{color}</code>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      background: color,
                      border: "1px solid #ddd",
                    }}
                  />
                </div>
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What is this course about?"
              />
            </label>

            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "1fr 1fr 1fr",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                Day
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                >
                  <option value="">(optional)</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <RoundTimePicker
                label="Start time"
                value={startTime}
                onChange={setStartTime}
              />

              <RoundTimePicker
                label="End time"
                value={endTime}
                onChange={setEndTime}
              />
            </div>

            <div
              style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                Course begins
                <input
                  type="date"
                  value={beginsOn}
                  onChange={(e) => setBeginsOn(e.target.value)}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                Course ends
                <input
                  type="date"
                  value={endsOn}
                  min={beginsOn || undefined}
                  onChange={(e) => setEndsOn(e.target.value)}
                />
              </label>
            </div>

            <div
              style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                Midterm date
                <input
                  type="date"
                  value={midtermDate}
                  onChange={(e) => setMidtermDate(e.target.value)}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                Final date
                <input
                  type="date"
                  value={finalDate}
                  onChange={(e) => setFinalDate(e.target.value)}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              Course image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </label>
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Course preview"
                style={{
                  width: 120,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                }}
              />
            ) : null}

            <label style={{ display: "grid", gap: 6 }}>
              Banner image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
              />
            </label>
            {bannerPreview ? (
              <img
                src={bannerPreview}
                alt="Banner preview"
                style={{
                  width: "100%",
                  maxWidth: 360,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                }}
              />
            ) : null}

            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !name.trim()}
              >
                {saving ? "Creating..." : "Create course"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
