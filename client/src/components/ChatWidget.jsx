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
    border: "1px solid #ddd",
    background: "white",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    zIndex: 9999,
  },
  panel: {
    position: "fixed",
    right: 18,
    bottom: 86,
    width: 360,
    maxWidth: "calc(100vw - 36px)",
    height: 460,
    maxHeight: "calc(100vh - 120px)",
    borderRadius: 16,
    border: "1px solid #ddd",
    background: "white",
    boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
    overflow: "hidden",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "10px 12px",
    borderBottom: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  body: {
    flex: 1,
    overflow: "auto",
    padding: 12,
    background: "#fafafa",
  },
  inputRow: {
    borderTop: "1px solid #eee",
    padding: 10,
    display: "flex",
    gap: 8,
    alignItems: "center",
    background: "white",
  },
  input: {
    flex: 1,
    borderRadius: 12,
    border: "1px solid #ddd",
    padding: "10px 12px",
    outline: "none",
    fontSize: 14,
  },
  send: {
    borderRadius: 12,
    border: "1px solid #ddd",
    padding: "10px 12px",
    background: "black",
    color: "white",
    cursor: "pointer",
  },
  msgRow: (role) => ({
    display: "flex",
    justifyContent: role === "user" ? "flex-end" : "flex-start",
    marginBottom: 10,
  }),
  bubble: (role) => ({
    maxWidth: "85%",
    whiteSpace: "pre-wrap",
    fontSize: 14,
    lineHeight: 1.35,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #e5e5e5",
    background: role === "user" ? "white" : "#fff",
  }),
  hint: {
    fontSize: 12,
    color: "#666",
    padding: "8px 12px",
    borderTop: "1px dashed #eee",
    background: "white",
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
              <button onClick={() => setMessages(messages.slice(0, 1))} style={{ border: "1px solid #ddd", borderRadius: 10, padding: "6px 10px" }}>
                Clear
              </button>
              <button onClick={() => setOpen(false)} style={{ border: "1px solid #ddd", borderRadius: 10, padding: "6px 10px" }}>
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
