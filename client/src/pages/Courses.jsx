
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiDeleteCourse, apiListCourses } from "../api/courses.api";
import { useLanguage } from "../context/LanguageContext";

function fmtTime(t) {
  return t ? String(t).slice(0, 5) : "";
}

function metaForCourse(course, t) {
  const parts = [];
  if (course.day_of_week) parts.push(t(course.day_of_week));
  if (course.start_time || course.end_time) {
    const start = fmtTime(course.start_time);
    const end = fmtTime(course.end_time);
    parts.push(start && end ? `${start}–${end}` : start || end);
  }
  if (course.begins_on || course.ends_on) {
    parts.push(`Runs ${course.begins_on || "?"} → ${course.ends_on || "?"}`);
  }
  if (course.midterm_date) parts.push(`${t("Midterm")} ${course.midterm_date}`);
  if (course.final_date) parts.push(`${t("Final")} ${course.final_date}`);
  return parts.map((part) => part.replace(/^Runs /, `${t("Runs")} `));
}

export default function Courses() {
  const { t } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const highlighted = useMemo(() => courses.slice(0, 1)[0] || null, [courses]);
  const rest = useMemo(() => (highlighted ? courses.slice(1) : courses), [courses, highlighted]);

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
      setError(err?.response?.data?.error?.message || "Failed to delete course");
    }
  }

  return (
    <>
      <Navbar />
      <div className="container stack course-page-shell" style={{ marginTop: 20 }}>
        <section className="course-hero card bg-texture">
          <div className="course-hero-copy">
            <div className="eyebrow">Study hub</div>
            <div className="title course-hero-title">Courses that feel organized, calm, and easy to scan.</div>
            <div className="small muted">
              Open a course to manage notes, tasks, schedule details, and deadlines together.
            </div>
          </div>

          <div className="course-hero-actions">
            <Link to="/courses/new" className="btn btn-primary">Create course</Link>
            <Link to="/tasks" className="btn btn-ghost">Open all tasks</Link>
          </div>
        </section>

        {error ? <div className="notice notice-danger">{error}</div> : null}

        {loading ? (
          <div className="card">Loading…</div>
        ) : courses.length === 0 ? (
          <div className="card">
            <div className="section-title">No courses yet</div>
            <div className="small muted" style={{ marginTop: 6 }}>
              Create your first course to start adding notes, lecture times, and task plans.
            </div>
          </div>
        ) : (
          <>
            {highlighted ? (
              <section className="feature-course card">
                <div className="feature-course-banner" style={{ backgroundImage: highlighted.banner_url ? `url(${highlighted.banner_url})` : "none" }}>
                  <div className="feature-course-overlay" />
                  <div className="feature-course-content">
                    <div className="course-dot" style={{ background: highlighted.color || "#94a3b8" }} />
                    <div>
                      <div className="eyebrow">Featured course</div>
                      <Link to={`/courses/${highlighted.id}`} className="feature-course-title">
                        {highlighted.name}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="feature-course-body">
                  <div className="small" style={{ whiteSpace: "pre-wrap" }}>
                    {highlighted.description || "Add a summary, meeting time, and course art to make this page feel alive and personal."}
                  </div>

                  {metaForCourse(highlighted, t).length ? (
                    <div className="course-meta-wrap">
                      {metaForCourse(highlighted, t).map((item) => (
                        <span key={item} className="course-chip">{item}</span>
                      ))}
                    </div>
                  ) : null}

                  <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
                    <Link to={`/courses/${highlighted.id}`} className="btn btn-primary">Open course</Link>
                    <button type="button" className="btn btn-danger" onClick={() => onDelete(highlighted.id)}>Delete</button>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="course-grid">
              {rest.map((course) => {
                const metaParts = metaForCourse(course, t);
                const courseInitial = course.name?.slice(0, 1)?.toUpperCase() || "C";
                return (
                  <article key={course.id} className="course-card card lift">
                    <Link to={`/courses/${course.id}`} className="course-card-media" aria-label={`Open ${course.name}`}>
                      {course.image_url ? (
                        <img className="course-card-image" src={course.image_url} alt={course.name} />
                      ) : (
                        <div className="course-card-image course-card-image-fallback">
                          <span>{courseInitial}</span>
                        </div>
                      )}

                      <div className="course-card-media-shade" />
                      <div className="course-card-media-copy">
                        <span className="course-dot" style={{ background: course.color || "#cbd5e1" }} />
                        <span className="course-card-kicker">Course</span>
                      </div>
                    </Link>

                    <div className="course-card-main">
                      <div className="course-card-head">
                        <div>
                          <Link to={`/courses/${course.id}`} className="course-card-title">
                            {course.name}
                          </Link>
                          <div className="course-card-subtitle">Notes, tasks, schedule, and deadlines.</div>
                        </div>
                      </div>

                      <div className="course-card-description">
                        {course.description || "No course description yet."}
                      </div>
                    </div>

                    {metaParts.length ? (
                      <div className="course-meta-wrap">
                        {metaParts.slice(0, 4).map((item) => (
                          <span key={item} className="course-chip">{item}</span>
                        ))}
                      </div>
                    ) : null}

                    <div className="course-card-actions">
                      <Link to={`/courses/${course.id}`} className="btn btn-ghost">Open</Link>
                      <button type="button" className="btn btn-danger" onClick={() => onDelete(course.id)}>Delete</button>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </div>
    </>
  );
}
