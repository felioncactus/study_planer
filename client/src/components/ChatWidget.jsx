import React, { useEffect, useRef, useState } from "react";
import { apiAssistantMessage } from "../api/assistant.api";
import { useAuth } from "../context/AuthContext";

const styles = {
  launcher: {
    position: "fixed",
    right: 18,
    bottom: 18,
    width: 54,
    height: 54,
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--fg)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    zIndex: 9999,
  },
  panel: {
    position: "fixed",
    right: 18,
    bottom: 84,
    width: 360,
    height: 520,
    borderRadius: 16,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--fg)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    zIndex: 9999,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "12px 12px",
    borderBottom: "1px solid var(--border)",
    background: "var(--card)",
  },
  title: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    lineHeight: 1.15,
  },
  titleTop: { fontSize: 14, fontWeight: 700 },
  titleSub: { fontSize: 12, color: "var(--muted)" },
  closeBtn: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--fg)",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
  },
  body: {
    flex: 1,
    overflow: "auto",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "var(--bg)",
  },
  msgRow: (role) => ({
    display: "flex",
    justifyContent: role === "user" ? "flex-end" : "flex-start",
  }),

  bubble: (role) => ({
    maxWidth: "85%",
    alignSelf: role === "user" ? "flex-end" : "flex-start",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: role === "user" ? "var(--card-2)" : "var(--card)",
    color: "var(--fg)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  }),
  hint: {
    fontSize: 12,
    color: "var(--muted)",
    padding: "8px 12px",
    borderTop: "1px dashed var(--border)",
    background: "var(--bg)",
  },
  form: {
    display: "flex",
    gap: 8,
    padding: 12,
    borderTop: "1px solid var(--border)",
    background: "var(--card)",
  },
  input: {
    flex: 1,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--fg)",
    padding: "10px 12px",
    outline: "none",
  },
  sendBtn: {
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--accent-2)",
    color: "var(--fg)",
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 600,
  },
};


export default function ChatWidget() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      content:
        "Hi! I can help you:\n• add tasks\n• schedule your week\n• tell you what's due\n\nTry: “Add a 2-hour math assignment due Friday, then schedule my week.”",
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
        { role: "assistant", content: "Sorry — I couldn't reach the assistant. Check server logs / OPENAI_API_KEY." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div style={styles.panel} role="dialog" aria-label="Study assistant">
          <div style={styles.header}>
            <div style={{ fontWeight: 700 }}>Study Assistant</div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button onClick={() => setMessages(messages.slice(0, 1))} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "6px 10px", background: "transparent", color: "var(--fg)" }}>
                Clear
              </button>
              <button onClick={() => setOpen(false)} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "6px 10px", background: "transparent", color: "var(--fg)" }}>
                ✕
              </button>
            </div>
          </div>

          <div style={styles.body} ref={listRef}>
            {messages.map((m, idx) => (
              <div key={idx} style={styles.msgRow(m.role)}>
                <div style={styles.bubble(m.role)}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={styles.msgRow("assistant")}>
                <div style={styles.bubble("assistant")}>Thinking…</div>
              </div>
            )}
          </div>

          <div style={styles.inputRow}>
            <input
              style={styles.input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask me to add tasks, plan your week, or give advice…"
            />
            <button style={styles.send} onClick={send} disabled={loading}>
              Send
            </button>
          </div>

          <div style={styles.hint}>
            Tip: If you want better schedules, add task durations (e.g. “2 hours”) and deadlines.
          </div>
        </div>
      )}

      <button style={styles.launcher} onClick={() => setOpen((v) => !v)} aria-label="Open chat">
        💬
      </button>
    </>
  );
}
