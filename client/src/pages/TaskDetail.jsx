import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  apiDeleteTask,
  apiDeleteTaskAttachment,
  apiGetTask,
  apiListTaskAttachments,
  apiUpdateTask,
  apiUploadTaskAttachment,
} from "../api/tasks.api";

function fmtBytes(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v) || v <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let x = v;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i += 1;
  }
  return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function TaskDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [task, setTask] = useState(null);
  const [attachments, setAttachments] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("todo");

  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const uploadsBase = useMemo(() => import.meta.env.VITE_UPLOADS_BASE_URL || "", []);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([apiGetTask(id), apiListTaskAttachments(id)]);
      setTask(tRes.task);
      setAttachments(aRes.attachments || []);

      setTitle(tRes.task?.title || "");
      setDescription(tRes.task?.description || "");
      setDueDate(tRes.task?.due_date || "");
      setStatus(tRes.task?.status || "todo");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load task");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        title,
        description: description?.trim() ? description : null,
        status,
        dueDate: dueDate || null,
      };
      const res = await apiUpdateTask(id, payload);
      setTask(res.task);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteTask() {
    if (!window.confirm("Delete this task?")) return;
    setError("");
    try {
      await apiDeleteTask(id);
      nav("/tasks");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to delete task");
    }
  }

  async function onUpload(e) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const res = await apiUploadTaskAttachment(id, file);
      const created = (res.attachments || [])[0];
      if (created) setAttachments((prev) => [created, ...prev]);
      setFile(null);
      // reset input
      const el = document.getElementById("task-attachment-input");
      if (el) el.value = "";
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  }

  async function onDeleteAttachment(att) {
    if (!window.confirm(`Delete attachment "${att.original_filename}"?`)) return;
    setError("");
    try {
      await apiDeleteTaskAttachment(id, att.id);
      setAttachments((prev) => prev.filter((x) => x.id !== att.id));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to delete attachment");
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container" style={{ marginTop: 18 }}>Loading...</div>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <Navbar />
        <div className="container stack" style={{ marginTop: 18 }}>
          <div style={{ marginBottom: 10 }}>
            <Link to="/tasks">← Back to tasks</Link>
          </div>
          <div style={{ color: "crimson" }}>{error || "Task not found"}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container stack" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link to="/tasks">← Back</Link>
            <h2 style={{ margin: 0, lineHeight: 1.1 }}>Task</h2>
          </div>
          <button className="btn btn-danger" onClick={onDeleteTask}>
            delete
          </button>
        </div>

        {error ? <div className="notice notice-danger">{error}</div> : null}

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Details</h3>

          <form onSubmit={onSave} style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Add details, links, notes…"
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                Due date
                <input type="date" value={dueDate || ""} onChange={(e) => setDueDate(e.target.value)} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="todo">todo</option>
                  <option value="doing">doing</option>
                  <option value="done">done</option>
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
                {saving ? "Saving..." : "Save"}
              </button>
              <div className="small muted">
                Created: {task.created_at ? new Date(task.created_at).toLocaleString() : "-"}
              </div>
            </div>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Attachments</h3>

          <form onSubmit={onUpload} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              id="task-attachment-input"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button type="submit" className="btn btn-primary" disabled={!file || uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <div className="small muted">Max 20MB per file</div>
          </form>

          {attachments.length === 0 ? (
            <div className="small muted" style={{ marginTop: 12 }}>No attachments yet.</div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {attachments.map((a) => {
                const href = `${uploadsBase}${a.url}`;
                return (
                  <div
                    key={a.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 12,
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: "var(--fg)", wordBreak: "break-word" }}>
                        <a href={href} target="_blank" rel="noreferrer">
                          {a.original_filename}
                        </a>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                        {fmtBytes(a.size_bytes)} • {a.mime_type || "unknown"} •{" "}
                        {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                      </div>
                    </div>

                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <a href={href} target="_blank" rel="noreferrer">
                        open
                      </a>
                      <button onClick={() => onDeleteAttachment(a)} className="btn btn-danger" type="button">
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
    </>
  );
}
