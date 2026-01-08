import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { apiCreateCourse, apiDeleteCourse, apiListCourses } from "../api/courses.api";

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [name, setName] = useState("CS101");
  const [color, setColor] = useState("blue");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await apiCreateCourse({ name, color });
      setName("");
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
      <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
        <h2>Courses</h2>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <h3>Create course</h3>
          <form onSubmit={onCreate} style={{ display: "grid", gap: 10, maxWidth: 420 }}>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
            </label>
            <label>
              Color (optional)
              <input value={color} onChange={(e) => setColor(e.target.value)} style={{ width: "100%" }} />
            </label>
            <button type="submit">Create</button>
          </form>
          {error && <div style={{ color: "crimson", marginTop: 10 }}>{error}</div>}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h3>Your courses</h3>
          {loading ? (
            <div>Loading...</div>
          ) : courses.length === 0 ? (
            <div>No courses yet.</div>
          ) : (
            <ul style={{ paddingLeft: 18 }}>
              {courses.map((c) => (
                <li key={c.id} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ minWidth: 140 }}>
                    <b>{c.name}</b> {c.color ? <span style={{ color: "#666" }}>({c.color})</span> : null}
                  </span>
                  <button onClick={() => onDelete(c.id)} style={{ marginLeft: "auto" }}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
