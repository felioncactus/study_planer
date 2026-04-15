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
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages, loading]);

  useEffect(() => {
    function onToggle() {
      setOpen((value) => !value);
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("kepka:toggle-assistant", onToggle);
    window.addEventListener("kepka:open-assistant", onOpen);
    return () => {
      window.removeEventListener("kepka:toggle-assistant", onToggle);
      window.removeEventListener("kepka:open-assistant", onOpen);
    };
  }, []);

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
    <div className={"assistant-shell" + (open ? " is-open" : "")}>
      <button
        type="button"
        className="assistant-launcher"
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">✦</span>
        <span className="assistant-launcher-text">Assistant</span>
      </button>

      {open ? (
        <section className="assistant-panel" aria-label="Study assistant panel">
          <header className="assistant-panel-header">
            <div>
              <div className="assistant-title">Study assistant</div>
              <div className="assistant-subtitle">Tasks, planning, reminders</div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>

          <div ref={listRef} className="assistant-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={"assistant-row" + (message.role === "user" ? " is-user" : "")}
              >
                <div className={"assistant-bubble" + (message.role === "user" ? " is-user" : "")}>
                  <MarkdownBubble content={message.content} />
                </div>
              </div>
            ))}

            {loading ? (
              <div className="assistant-row">
                <div className="assistant-bubble">
                  <div className="chat-md"><p>Thinking…</p></div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="assistant-hint">
            Markdown like <strong>bold</strong>, <em>italic</em>, lists, and <code>code</code> renders here.
          </div>

          <form
            className="assistant-form"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              className="assistant-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about tasks, due dates, or your week..."
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !text.trim()}>
              Send
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
