import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchMessages, sendMessage } from "../api/messages.api";
import { fetchFriends } from "../api/friends.api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

function Bubble({ mine, body, time }) {
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
      <div
        className="card"
        style={{
          maxWidth: 560,
          padding: 10,
          margin: "4px 0",
          opacity: mine ? 1 : 0.95,
        }}
      >
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{body}</div>
        <div className="small muted" style={{ marginTop: 6, textAlign: mine ? "right" : "left" }}>
          {time}
        </div>
      </div>
    </div>
  );
}

export default function FriendChat() {
  const { friendId } = useParams();
  const { user } = useAuth();

  const [friend, setFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const title = useMemo(() => {
    if (!friend) return "Chat";
    return friend.friend_name || friend.friend_email || "Chat";
  }, [friend]);

  async function loadFriend() {
    const d = await fetchFriends();
    const all = [...(d.accepted || []), ...(d.pending_inbound || []), ...(d.pending_outbound || []), ...(d.blocked || [])];
    const r = all.find((x) => x.friend_id === friendId);
    if (r) setFriend(r);
  }

  async function refreshMessages() {
    try {
      const d = await fetchMessages(friendId);
      setMessages(d.messages || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to load messages");
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await loadFriend();
        await refreshMessages();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    pollRef.current = setInterval(() => {
      refreshMessages();
    }, 3000);

    return () => {
      mounted = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function onSend() {
    const v = text.trim();
    if (!v) return;
    setError("");
    setText("");
    try {
      await sendMessage(friendId, v);
      await refreshMessages();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to send");
      setText(v);
    }
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 18, paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <div className="small muted" style={{ marginTop: 6 }}>
            {friend?.friend_email || ""}
          </div>
        </div>
        <Link className="btn btn-ghost" to="/friends">
          ← Back
        </Link>
      </div>

      {loading ? (
        <div className="card" style={{ marginTop: 12 }}>
          Loading…
        </div>
      ) : (
        <>
          {error ? (
            <div className="card" style={{ marginTop: 12, color: "var(--danger)" }}>
              {error}
            </div>
          ) : null}

          <div
            className="card"
            style={{ marginTop: 12, height: "60vh", overflow: "auto", padding: 12, display: "grid" }}
          >
            {messages.length === 0 ? (
              <div className="muted">No messages yet.</div>
            ) : (
              messages.map((m) => (
                <Bubble
                  key={m.id}
                  mine={m.sender_id === user?.id}
                  body={m.body}
                  time={new Date(m.created_at).toLocaleString()}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                className="input"
                placeholder="Type a message…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSend();
                }}
                style={{ flex: 1 }}
              />
              <button className="btn" onClick={onSend} disabled={!text.trim()}>
                Send
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </>
  );
}
