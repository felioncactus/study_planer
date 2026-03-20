import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiDeleteCourse, apiListCourses } from "../api/courses.api";

function fmtTime(t) {
  return t ? String(t).slice(0, 5) : "";
}

function metaForCourse(course) {
  const parts = [];
  if (course.day_of_week) parts.push(course.day_of_week);
  if (course.start_time || course.end_time) {
    const start = fmtTime(course.start_time);
    const end = fmtTime(course.end_time);
    parts.push(start && end ? `${start}–${end}` : start || end);
  }
  if (course.midterm_date) parts.push(`Midterm ${course.midterm_date}`);
  if (course.final_date) parts.push(`Final ${course.final_date}`);
  return parts;
}

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const data = await apiListCourses();
      setCourses(data.courses || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onDelete(id) {
    setError("");
    try {
      await apiDeleteCourse(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(
        err?.response?.data?.error?.message || "Failed to delete course",
      );
    }
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
        <div className="page-header">
          <div>
            <div className="title">Courses</div>
            <div className="small muted">
              Open a course to manage notes, tasks, and settings together.
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Link to="/courses/new" className="btn btn-primary">
              Create course
            </Link>
            <Link to="/tasks" className="btn btn-ghost">
              Open all tasks
            </Link>
          </div>
        </div>

        {error ? <div className="notice notice-danger">{error}</div> : null}

        <div className="card">
          {loading ? (
            <div>Loading…</div>
          ) : courses.length === 0 ? (
            <div className="small muted">
              No courses yet. Create your first course to start adding notes and tasks.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {courses.map((course) => {
                const metaParts = metaForCourse(course);
                return (
                  <div
                    key={course.id}
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "stretch",
                      border: "1px solid #e5e7eb",
                      borderRadius: 16,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        background: course.color || "#cbd5e1",
                        flex: "0 0 auto",
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        padding: 14,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <Link
                            to={`/courses/${course.id}`}
                            style={{
                              fontWeight: 800,
                              fontSize: 18,
                              textDecoration: "none",
                              color: "inherit",
                            }}
                          >
                            {course.name}
                          </Link>
                          {course.color ? (
                            <span
                              title={course.color}
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                background: course.color,
                                border: "1px solid #ddd",
                              }}
                            />
                          ) : null}
                        </div>

                        {course.description ? (
                          <div
                            style={{
                              marginTop: 6,
                              color: "#444",
                              fontSize: 13,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {course.description}
                          </div>
                        ) : null}

                        {metaParts.length ? (
                          <div
                            style={{
                              marginTop: 8,
                              color: "#666",
                              fontSize: 12,
                            }}
                          >
                            {metaParts.join(" • ")}
                          </div>
                        ) : null}
                      </div>

                      <div className="row" style={{ gap: 8 }}>
                        <Link
                          to={`/courses/${course.id}`}
                          className="btn btn-ghost"
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => onDelete(course.id)}
                        >
                          Delete
                        </button>
                      </div>
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
