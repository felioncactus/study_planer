import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiGetNote, apiUpdateNote, apiDeleteNote } from "../api/notes.api";
import { apiNoteAssistantHelp } from "../api/noteAssistant.api";

const TOOLBAR_BUTTON = {
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  background: "white",
  cursor: "pointer",
};

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

function stripAiMarkup(html) {
  if (!html) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("[data-ai-added]").forEach((el) => {
    const text = doc.createTextNode(el.textContent || "");
    el.replaceWith(text);
  });
  return doc.body.innerHTML;
}

function tokenize(value) {
  return String(value || "").match(/<[^>]+>|&[a-zA-Z0-9#]+;|\s+|[^\s<>&]+/g) || [];
}

function highlightAddedText(previousHtml, nextHtml) {
  const before = tokenize(stripAiMarkup(previousHtml));
  const after = tokenize(stripAiMarkup(nextHtml));
  const m = before.length;
  const n = after.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (before[i] === after[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out = [];
  let i = 0;
  let j = 0;

  while (i < m && j < n) {
    if (before[i] === after[j]) {
      out.push(after[j]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      const token = after[j];
      if (/^\s+$/.test(token) || /^<[^>]+>$/.test(token)) {
        out.push(token);
      } else {
        out.push(`<span data-ai-added="true" style="background:#dcfce7;color:#166534;padding:0 0.08em;border-radius:0.2em;">${token}</span>`);
      }
      j += 1;
    }
  }

  while (j < n) {
    const token = after[j];
    if (/^\s+$/.test(token) || /^<[^>]+>$/.test(token)) out.push(token);
    else out.push(`<span data-ai-added="true" style="background:#dcfce7;color:#166534;padding:0 0.08em;border-radius:0.2em;">${token}</span>`);
    j += 1;
  }

  return out.join("");
}

function ensureEditorHtml(value) {
  const clean = stripAiMarkup(value);
  return clean && clean.trim() ? clean : "<p></p>";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPrintableNoteHtml({ title, contentHtml }) {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title || "Note")}</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: white; color: #111827; }
          body { font-family: Arial, Helvetica, sans-serif; padding: 40px; }
          h1 { margin: 0 0 8px; font-size: 28px; }
          .meta { color: #6b7280; margin-bottom: 24px; font-size: 14px; }
          article { font-size: 15px; }
          p, li { line-height: 1.7; }
          h2, h3, h4 { margin-top: 24px; }
          blockquote { margin: 16px 0; padding-left: 16px; border-left: 4px solid #d1d5db; color: #374151; }
          table { border-collapse: collapse; width: 100%; margin: 12px 0; }
          td, th { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
          img { max-width: 100%; height: auto; }
          pre, code { white-space: pre-wrap; word-break: break-word; }
          @page { size: auto; margin: 16mm; }
          @media print {
            html, body { background: white !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title || "Untitled note")}</h1>
        <div class="meta">Exported ${escapeHtml(new Date().toLocaleString())}</div>
        <article>${contentHtml}</article>
      </body>
    </html>
  `;
}


export default function NoteEditor() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const saveTimerRef = useRef(null);

  const [note, setNote] = useState(null);
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("<p></p>");
  const [history, setHistory] = useState(["<p></p>"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content: "Ask me to improve grammar, fix spelling, write an outline, summarize the lesson, or rewrite sections.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingSuggestion, setPendingSuggestion] = useState("");

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const stats = useMemo(() => {
    const text = stripAiMarkup(contentHtml).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const words = text ? text.split(" ").length : 0;
    return { words };
  }, [contentHtml]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiGetNote(noteId);
        if (ignore) return;
        const initialHtml = ensureEditorHtml(data.note.content_html);
        setNote(data.note);
        setTitle(data.note.title || "");
        setContentHtml(initialHtml);
        setHistory([initialHtml]);
        setHistoryIndex(0);
      } catch (err) {
        if (!ignore) setError(err?.response?.data?.error?.message || "Failed to load note");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [noteId]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== contentHtml) {
      editorRef.current.innerHTML = contentHtml;
    }
  }, [contentHtml]);

  function pushHistory(nextHtml) {
    const cleanHtml = ensureEditorHtml(nextHtml);
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      if (truncated[truncated.length - 1] === cleanHtml) return truncated;
      const next = [...truncated, cleanHtml].slice(-120);
      const nextIndex = next.length - 1;
      setHistoryIndex(nextIndex);
      return next;
    });
  }

  function applyContent(nextHtml, options = {}) {
    const cleanHtml = ensureEditorHtml(nextHtml);
    setContentHtml(cleanHtml);
    if (!options.skipHistory) pushHistory(cleanHtml);
  }

  function handleEditorInput() {
    const html = editorRef.current?.innerHTML || "<p></p>";
    setPendingSuggestion("");
    setNotice("");
    applyContent(html);
  }

  async function saveNote(nextTitle = title, nextHtml = contentHtml, quiet = false) {
    setSaving(true);
    setError("");
    try {
      const data = await apiUpdateNote(noteId, {
        title: String(nextTitle || "").trim() || "Untitled note",
        contentHtml: stripAiMarkup(nextHtml),
      });
      setNote(data.note);
      setTitle(data.note.title || "");
      if (!quiet) setNotice("Saved.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!note) return undefined;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveNote(title, contentHtml, true);
    }, 1200);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, contentHtml]); // eslint-disable-line react-hooks/exhaustive-deps

  function runEditorCommand(command, value) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  }

  function undo() {
    if (!canUndo) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setContentHtml(history[nextIndex]);
    setPendingSuggestion("");
  }

  function redo() {
    if (!canRedo) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setContentHtml(history[nextIndex]);
    setPendingSuggestion("");
  }

  async function askAssistant(e) {
    e.preventDefault();
    const message = chatInput.trim();
    if (!message || assistantBusy) return;
    const nextMessages = [...chatMessages, { role: "user", content: message }];
    setChatMessages(nextMessages);
    setChatInput("");
    setAssistantBusy(true);
    setError("");

    try {
      const data = await apiNoteAssistantHelp({
        noteId,
        title,
        contentHtml: stripAiMarkup(contentHtml),
        message,
        history: nextMessages,
      });
      const suggested = ensureEditorHtml(data.editedHtml);
      const highlighted = highlightAddedText(contentHtml, suggested);
      setPendingSuggestion(highlighted);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.chatMessage },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't process that request right now." },
      ]);
      setError(err?.response?.data?.error?.message || "AI assistant failed");
    } finally {
      setAssistantBusy(false);
    }
  }

  function applySuggestion() {
    if (!pendingSuggestion) return;
    const clean = stripAiMarkup(pendingSuggestion);
    applyContent(clean);
    setPendingSuggestion("");
    setNotice("AI suggestion applied.");
  }

  function discardSuggestion() {
    setPendingSuggestion("");
  }

  async function deleteNote() {
    const ok = window.confirm("Delete this note?");
    if (!ok) return;
    try {
      await apiDeleteNote(noteId);
      navigate(`/courses/${note?.course_id || ""}`);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to delete note");
    }
  }

  function exportPdf() {
    setError("");
    setNotice("");

    const printableHtml = buildPrintableNoteHtml({
      title,
      contentHtml: stripAiMarkup(contentHtml),
    });

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";

    const cleanup = () => {
      window.setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    };

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        setError("Failed to open print preview.");
        return;
      }

      frameWindow.focus();
      window.setTimeout(() => {
        try {
          frameWindow.print();
          setNotice("Print dialog opened. Choose Save as PDF to export the note.");
        } catch {
          setError("Failed to open the print dialog.");
        } finally {
          cleanup();
        }
      }, 250);
    };

    document.body.appendChild(iframe);

    try {
      iframe.srcdoc = printableHtml;
    } catch {
      const frameDocument = iframe.contentDocument || iframe.contentWindow?.document;
      if (!frameDocument) {
        cleanup();
        setError("Failed to prepare the PDF export.");
        return;
      }

      frameDocument.open();
      frameDocument.write(printableHtml);
      frameDocument.close();
    }
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 1480, margin: "24px auto", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ marginBottom: 6 }}>
              <Link to={note ? `/courses/${note.course_id}` : "/courses"}>← Back to course</Link>
            </div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>
              {note?.course_name || "Course note"} · Created {formatStamp(note?.created_at)} · Updated {formatStamp(note?.updated_at)}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={undo} disabled={!canUndo}>←</button>
            <button type="button" onClick={redo} disabled={!canRedo}>→</button>
            <button type="button" onClick={() => saveNote()} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button type="button" onClick={exportPdf}>Export PDF</button>
            <button type="button" onClick={deleteNote} style={{ color: "crimson" }}>Delete</button>
          </div>
        </div>

        {error ? <div style={{ marginBottom: 12, color: "crimson" }}>{error}</div> : null}
        {notice ? <div style={{ marginBottom: 12, color: "#166534" }}>{notice}</div> : null}

        {loading ? (
          <div>Loading…</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 18, alignItems: "start" }}>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb", display: "grid", gap: 10 }}>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                  style={{ fontSize: 28, fontWeight: 800, border: "none", outline: "none", width: "100%" }}
                />

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={TOOLBAR_BUTTON} onClick={() => runEditorCommand("bold")}>Bold</button>
                  <button type="button" style={TOOLBAR_BUTTON} onClick={() => runEditorCommand("italic")}>Italic</button>
                  <button type="button" style={TOOLBAR_BUTTON} onClick={() => runEditorCommand("underline")}>Underline</button>
                  <button type="button" style={TOOLBAR_BUTTON} onClick={() => runEditorCommand("formatBlock", "<H2>")}>Heading</button>
                  <button type="button" style={TOOLBAR_BUTTON} onClick={() => runEditorCommand("insertUnorderedList")}>Bullets</button>
                  <button type="button" style={TOOLBAR_BUTTON} onClick={() => runEditorCommand("insertOrderedList")}>Numbered</button>
                  <button type="button" style={TOOLBAR_BUTTON} onClick={() => runEditorCommand("formatBlock", "<BLOCKQUOTE>")}>Quote</button>
                  <button type="button" style={TOOLBAR_BUTTON} onClick={() => runEditorCommand("removeFormat")}>Clear</button>
                </div>
              </div>

              {pendingSuggestion ? (
                <div style={{ margin: 16, padding: 14, border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>AI suggestion preview</div>
                  <div style={{ color: "#166534", fontSize: 14, marginBottom: 10 }}>
                    New text is highlighted in green.
                  </div>
                  <div
                    style={{ border: "1px solid #dcfce7", borderRadius: 12, padding: 16, background: "white", maxHeight: 260, overflow: "auto" }}
                    dangerouslySetInnerHTML={{ __html: pendingSuggestion }}
                  />
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button type="button" onClick={applySuggestion}>Apply suggestion</button>
                    <button type="button" onClick={discardSuggestion}>Discard</button>
                  </div>
                </div>
              ) : null}

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                style={{
                  minHeight: "70vh",
                  padding: 28,
                  outline: "none",
                  lineHeight: 1.7,
                  fontSize: 16,
                  background: "linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)",
                }}
              />
            </div>

            <aside className="card" style={{ position: "sticky", top: 84 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>AI assistant</h3>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{stats.words} words</span>
              </div>

              <div style={{ display: "grid", gap: 10, maxHeight: "58vh", overflow: "auto", marginTop: 14 }}>
                {chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: message.role === "user" ? "#eff6ff" : "#f9fafb",
                      border: "1px solid #e5e7eb",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                      {message.role === "user" ? "You" : "Assistant"}
                    </div>
                    <div>{message.content}</div>
                  </div>
                ))}
              </div>

              <form onSubmit={askAssistant} style={{ display: "grid", gap: 10, marginTop: 14 }}>
                <textarea
                  rows={4}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Fix grammar in this lesson, make an outline, improve clarity, summarize key points..."
                />
                <button type="submit" disabled={assistantBusy}>
                  {assistantBusy ? "Working…" : "Ask assistant"}
                </button>
              </form>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
