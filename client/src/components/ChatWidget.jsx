import React, { useEffect, useRef, useState } from "react";
import { apiAssistantMessage } from "../api/assistant.api";
import { useAuth } from "../context/AuthContext";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  return html;
}

function renderMarkdown(text) {
  const source = String(text || "").replace(/\r\n/g, "\n");
  const lines = source.split("\n");
  const parts = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) return;
    parts.push(`<ul>${listItems.join("")}</ul>`);
    listItems = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      listItems.push(`<li>${renderInlineMarkdown(line.replace(/^[-*•]\s+/, ""))}</li>`);
      continue;
    }
    flushList();
    parts.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  flushList();
  return parts.join("") || "<p></p>";
}

const styles = {
  launcher: {
    position: "fixed",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "linear-gradient(180deg, var(--card-2), var(--card))",
    color: "var(--fg)",
    boxShadow: "var(--shadow)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    zIndex: 9999,
  },
  panel: {
    position: "fixed",
    right: 18,
    bottom: 84,
    width: 380,
    height: 560,
    borderRadius: 20,
    border: "1px solid var(--border)",
    background: "linear-gradient(180deg, color-mix(in srgb, var(--card-2) 90%, transparent), color-mix(in srgb, var(--bg) 92%, transparent))",
    color: "var(--fg)",
    boxShadow: "0 22px 80px rgba(0,0,0,0.42)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    zIndex: 9999,
    backdropFilter: "blur(14px)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "14px 14px",
    borderBottom: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--card-2) 88%, transparent)",
  },
  title: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    lineHeight: 1.15,
  },
  titleTop: { fontSize: 14, fontWeight: 700 },
  titleSub: { fontSize: 12, color: "var(--muted)" },
  closeBtn: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--fg)",
    borderRadius: 12,
    padding: "6px 10px",
    cursor: "pointer",
  },
  body: {
    flex: 1,
    overflow: "auto",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "transparent",
  },
  msgRow: (role) => ({
    display: "flex",
    justifyContent: role === "user" ? "flex-end" : "flex-start",
  }),
  bubble: (role) => ({
    maxWidth: "88%",
    alignSelf: role === "user" ? "flex-end" : "flex-start",
    padding: "12px 14px",
    borderRadius: 18,
    border: "1px solid var(--border)",
    background: role === "user" ? "rgba(124, 124, 255, 0.16)" : "color-mix(in srgb, var(--card) 88%, transparent)",
    color: "var(--fg)",
    wordBreak: "break-word",
    boxShadow: role === "user" ? "0 10px 28px rgba(124,124,255,0.12)" : "none",
  }),
  hint: {
    fontSize: 12,
    color: "var(--muted)",
    padding: "10px 14px",
    borderTop: "1px dashed var(--border)",
    background: "color-mix(in srgb, var(--card) 72%, transparent)",
  },
  form: {
    display: "flex",
    gap: 8,
    padding: 12,
    borderTop: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--card-2) 88%, transparent)",
  },
  input: {
    flex: 1,
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--fg)",
    padding: "11px 13px",
    outline: "none",
  },
  sendBtn: {
    borderRadius: 14,
    border: "1px solid rgba(124,124,255,0.35)",
    background: "rgba(124,124,255,0.16)",
    color: "var(--fg)",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
};

function MarkdownBubble({ content }) {
  return <div className="chat-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />;
}

export default function ChatWidget() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      content:
        "Hi! I can help you:\n• add tasks\n• schedule your week\n• tell you what's due\n\nTry: **Add a 2-hour math assignment due Friday, then schedule my week.**",
    },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, loading]);

  if (!token) return null;

  async function send() {
    const content = text.trim();
    if (!content || loading) return;

    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setText("");
    setLoading(true);

    try {
      const res = await apiAssistantMessage(next);
      setMessages((prev) => [...prev, { role: "assistant", content: res.message }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry — I couldn't answer that right now." },
      ]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close assistant" : "Open assistant"}
        style={styles.launcher}
        onClick={() => setOpen((v) => !v)}
      >
        💬
      </button>

      {open ? (
        <div style={styles.panel}>
          <div style={styles.header}>
            <div style={styles.title}>
              <div style={styles.titleTop}>Study assistant</div>
              <div style={styles.titleSub}>Tasks, planning, reminders</div>
            </div>
            <button type="button" style={styles.closeBtn} onClick={() => setOpen(false)}>
              Close
            </button>
          </div>

          <div ref={listRef} style={styles.body}>
            {messages.map((message, index) => (
              <div key={index} style={styles.msgRow(message.role)}>
                <div style={styles.bubble(message.role)}>
                  <MarkdownBubble content={message.content} />
                </div>
              </div>
            ))}

            {loading ? (
              <div style={styles.msgRow("assistant")}>
                <div style={styles.bubble("assistant")}>
                  <div className="chat-md">
                    <p>Thinking…</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div style={styles.hint}>Markdown like **bold**, *italic*, bullet lists, and `code` now renders properly.</div>

          <form
            style={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              style={styles.input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about tasks, due dates, or your week..."
            />
            <button type="submit" style={styles.sendBtn} disabled={loading || !text.trim()}>
              Send
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
