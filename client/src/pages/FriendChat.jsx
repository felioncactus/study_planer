
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  clearChat,
  createGroupChat,
  deleteChat,
  deleteChatMessage,
  editChatMessage,
  fetchChat,
  fetchChatMessages,
  fetchChats,
  fetchSelfChat,
  openDirectChat,
  sendChatMessage,
} from "../api/chats.api";
import { fetchFriends } from "../api/friends.api";
import { useAuth } from "../context/AuthContext";
import { formatBytes, renderChatMarkdown } from "../components/chatFormatting";

const EMOJIS = ["😀", "😂", "😍", "🤔", "🔥", "👍", "🎉", "❤️"];

function MessageBubble({ message, mine, onEdit, onDelete, busy }) {
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const editedAt = message?.metadata?.edited_at;
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
      <div className="card" style={{ maxWidth: 640, padding: 12, margin: "4px 0", opacity: mine ? 1 : 0.97 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div className="small muted" style={{ marginBottom: 8 }}>
            {message.sender_kind === "bot" ? "🤖 Bot" : message.sender_name || "User"}
          </div>
          {mine ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-ghost" onClick={() => onEdit(message)} disabled={busy}>
                Edit
              </button>
              <button className="btn btn-ghost" onClick={() => onDelete(message)} disabled={busy}>
                Delete
              </button>
            </div>
          ) : null}
        </div>
        <div
          style={{ whiteSpace: "normal", wordBreak: "break-word" }}
          dangerouslySetInnerHTML={{ __html: renderChatMarkdown(message.body) }}
        />
        {attachments.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {attachments.map((att) => (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
                style={{ justifyContent: "flex-start" }}
              >
                📎 {att.original_filename}
                <span className="small muted" style={{ marginLeft: 8 }}>
                  {formatBytes(att.size_bytes)}
                </span>
              </a>
            ))}
          </div>
        ) : null}
        <div className="small muted" style={{ marginTop: 8, textAlign: mine ? "right" : "left" }}>
          {new Date(message.created_at).toLocaleString()}
          {editedAt ? ` • edited ${new Date(editedAt).toLocaleString()}` : ""}
        </div>
      </div>
    </div>
  );
}

function GroupCreateCard({ acceptedFriends, onCreate, busy }) {
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState([]);

  function toggle(id) {
    setSelected((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  }

  async function submit() {
    const cleanTitle = title.trim();
    if (!cleanTitle || selected.length === 0) return;
    await onCreate({ title: cleanTitle, memberIds: selected });
    setTitle("");
    setSelected([]);
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Create group chat</h3>
      <div style={{ display: "grid", gap: 10 }}>
        <input className="input" placeholder="Group title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="small muted">Select accepted friends to include.</div>
        <div style={{ display: "grid", gap: 8, maxHeight: 200, overflow: "auto" }}>
          {acceptedFriends.map((friend) => (
            <label key={friend.friend_id} className="card" style={{ padding: 10, display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={selected.includes(friend.friend_id)} onChange={() => toggle(friend.friend_id)} />
              <span>{friend.friend_name || friend.friend_email}</span>
            </label>
          ))}
          {acceptedFriends.length === 0 ? <div className="small muted">Add friends first to create a group.</div> : null}
        </div>
        <button className="btn" onClick={submit} disabled={busy || !title.trim() || selected.length === 0}>
          Create group
        </button>
      </div>
    </div>
  );
}

export default function FriendChat() {
  const { friendId, chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([]);
  const [friendsData, setFriendsData] = useState({ accepted: [], pending_inbound: [], pending_outbound: [], blocked: [] });
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editingBody, setEditingBody] = useState("");

  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  const title = useMemo(() => chat?.title || "Chat", [chat]);
  const canDeleteChat = useMemo(() => {
    if (!chat) return false;
    return chat.type !== "group" || !chat.created_by || chat.created_by === user?.id;
  }, [chat, user?.id]);

  async function refreshSidebar() {
    const [chatData, friendData] = await Promise.all([fetchChats(), fetchFriends()]);
    setChats(chatData.chats || []);
    setFriendsData(friendData);
  }

  async function ensureChatSelected() {
    if (chatId) {
      const detail = await fetchChat(chatId);
      setChat(detail.chat);
      return detail.chat.id;
    }
    if (friendId === "self") {
      const detail = await fetchSelfChat();
      setChat(detail.chat);
      navigate(`/conversations/${detail.chat.id}`, { replace: true });
      return detail.chat.id;
    }
    if (friendId) {
      const detail = await openDirectChat(friendId);
      setChat(detail.chat);
      navigate(`/conversations/${detail.chat.id}`, { replace: true });
      return detail.chat.id;
    }
    setChat(null);
    setMessages([]);
    return null;
  }

  async function refreshMessages(selectedChatId = chat?.id) {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }
    const d = await fetchChatMessages(selectedChatId);
    setMessages(d.messages || []);
  }

  async function refreshEverything() {
    setError("");
    const selectedChatId = await ensureChatSelected();
    await Promise.all([refreshSidebar(), refreshMessages(selectedChatId)]);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        await refreshEverything();
      } catch (e) {
        if (mounted) setError(e?.response?.data?.error?.message || e?.message || "Failed to load chat");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    pollRef.current = setInterval(() => {
      refreshEverything().catch(() => {});
    }, 4000);

    return () => {
      mounted = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId, chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function onSend() {
    if (!chat?.id) return;
    if (!text.trim() && attachments.length === 0) return;
    const nextText = text;
    const nextFiles = attachments;
    setBusy(true);
    setError("");
    setText("");
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    try {
      await sendChatMessage(chat.id, { body: nextText, attachments: nextFiles });
      await refreshEverything();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to send");
      setText(nextText);
      setAttachments(nextFiles);
    } finally {
      setBusy(false);
    }
  }

  function applyWrap(token) {
    const value = text || "";
    setText(`${value}${value && !value.endsWith(" ") ? " " : ""}${token}`);
  }

  async function handleCreateGroup(payload) {
    try {
      setBusy(true);
      const result = await createGroupChat(payload);
      await refreshSidebar();
      navigate(`/conversations/${result.chat.id}`);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to create group");
    } finally {
      setBusy(false);
    }
  }

  async function handleClearChat() {
    if (!chat?.id) return;
    if (!window.confirm(`Clear all messages in "${title}"?`)) return;
    try {
      setBusy(true);
      setError("");
      await clearChat(chat.id);
      await refreshEverything();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to clear chat");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteChat() {
    if (!chat?.id) return;
    if (!window.confirm(`Delete chat "${title}"? This cannot be undone.`)) return;
    try {
      setBusy(true);
      setError("");
      await deleteChat(chat.id);
      await refreshSidebar();
      setChat(null);
      setMessages([]);
      navigate("/chat", { replace: true });
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to delete chat");
    } finally {
      setBusy(false);
    }
  }

  function handleEditMessage(message) {
    if (!chat?.id || !message?.id) return;
    setEditingMessage(message);
    setEditingBody(message.body || "");
    setError("");
  }

  function closeEditComposer() {
    if (busy) return;
    setEditingMessage(null);
    setEditingBody("");
  }

  async function submitEditMessage() {
    if (!chat?.id || !editingMessage?.id) return;
    const trimmed = editingBody.trim();
    if (!trimmed) {
      setError("Message body is required");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await editChatMessage(chat.id, editingMessage.id, { body: trimmed });
      await refreshMessages(chat.id);
      await refreshSidebar();
      closeEditComposer();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to edit message");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteMessage(message) {
    if (!chat?.id || !message?.id) return;
    if (!window.confirm("Delete this message?")) return;
    try {
      setBusy(true);
      setError("");
      await deleteChatMessage(chat.id, message.id);
      await refreshMessages(chat.id);
      await refreshSidebar();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to delete message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 18, paddingBottom: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0 }}>Chats</h3>
                <button className="btn btn-ghost" onClick={() => navigate("/chat/self")}>
                  Self chat
                </button>
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {chats.map((item) => (
                  <button
                    key={item.id}
                    className="btn btn-ghost"
                    style={{ justifyContent: "space-between" }}
                    onClick={() => navigate(`/conversations/${item.id}`)}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.type === "group" ? "👥 " : item.type === "self" ? "📝 " : "💬 "}
                      {item.title}
                    </span>
                    {item.unread_count ? <span className="small muted">{item.unread_count}</span> : null}
                  </button>
                ))}
                {chats.length === 0 ? <div className="small muted">No chats yet.</div> : null}
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Start direct chat</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {friendsData.accepted.map((friend) => (
                  <button key={friend.friend_id} className="btn btn-ghost" onClick={() => navigate(`/chat/${friend.friend_id}`)}>
                    {friend.friend_name || friend.friend_email}
                  </button>
                ))}
                {friendsData.accepted.length === 0 ? <div className="small muted">No accepted friends yet.</div> : null}
              </div>
            </div>

            <GroupCreateCard acceptedFriends={friendsData.accepted || []} onCreate={handleCreateGroup} busy={busy} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>{title}</h2>
                <div className="small muted" style={{ marginTop: 6 }}>
                  {(chat?.participants || []).map((p) => p.name || p.email).join(", ")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {chat?.id ? (
                  <>
                    <button className="btn btn-ghost" onClick={handleClearChat} disabled={busy}>
                      Clear chat
                    </button>
                    {canDeleteChat ? (
                      <button className="btn btn-ghost" onClick={handleDeleteChat} disabled={busy}>
                        Delete chat
                      </button>
                    ) : null}
                  </>
                ) : null}
                <Link className="btn btn-ghost" to="/friends">
                  ← Back
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="card" style={{ marginTop: 12 }}>Loading…</div>
            ) : (
              <>
                {error ? <div className="card" style={{ marginTop: 12, color: "var(--danger)" }}>{error}</div> : null}

                <div className="card" style={{ marginTop: 12, height: "60vh", overflow: "auto", padding: 12, display: "grid" }}>
                  {!chat?.id ? (
                    <div className="muted">Pick a chat from the left, start a direct chat, or open self chat.</div>
                  ) : messages.length === 0 ? (
                    <div className="muted">
                      No messages yet. Use markdown like <code>**bold**</code>, <code>*italic*</code>, and <code># header</code>.
                      Use <code>/bot your question</code> to ask the shared AI bot.
                    </div>
                  ) : (
                    messages.map((m) => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        mine={m.sender_id === user?.id && m.sender_kind === "user"}
                        onEdit={handleEditMessage}
                        onDelete={handleDeleteMessage}
                        busy={busy}
                      />
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>


                {editingMessage ? (
                  <div className="modal-backdrop">
                    <div className="modal-card" style={{ width: "min(760px, 100%)" }}>
                      <div className="page-header" style={{ marginTop: 0 }}>
                        <div>
                          <h3 style={{ margin: 0 }}>Edit message</h3>
                          <div className="small muted" style={{ marginTop: 6 }}>
                            Update your message in the chat editor instead of the browser prompt.
                          </div>
                        </div>
                        <button className="btn btn-ghost" type="button" onClick={closeEditComposer} disabled={busy}>
                          Close
                        </button>
                      </div>
                      <div style={{ display: "grid", gap: 10 }}>
                        <textarea
                          className="input"
                          value={editingBody}
                          onChange={(e) => setEditingBody(e.target.value)}
                          rows={6}
                          disabled={busy}
                          placeholder="Edit your message…"
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                          <button className="btn btn-ghost" type="button" onClick={closeEditComposer} disabled={busy}>
                            Cancel
                          </button>
                          <button className="btn btn-primary" type="button" onClick={submitEditMessage} disabled={busy || !editingBody.trim()}>
                            Save message
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="card" style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <button className="btn btn-ghost" onClick={() => applyWrap("**bold**")}>Bold</button>
                    <button className="btn btn-ghost" onClick={() => applyWrap("*italic*")}>Italic</button>
                    <button className="btn btn-ghost" onClick={() => applyWrap("# Header")}>Header</button>
                    <button className="btn btn-ghost" onClick={() => applyWrap("/bot ")}>Ask bot</button>
                    {EMOJIS.map((emoji) => (
                      <button key={emoji} className="btn btn-ghost" onClick={() => setText((curr) => `${curr}${emoji}`)}>
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <textarea
                      className="input"
                      placeholder="Type a message…"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={5}
                      style={{ width: "100%", resize: "vertical" }}
                      disabled={!chat?.id || busy}
                    />
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                        disabled={!chat?.id || busy}
                      />
                      <div className="small muted">
                        {attachments.length ? attachments.map((file) => file.name).join(", ") : "No attachments selected"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setText("");
                          setAttachments([]);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        disabled={busy}
                      >
                        Clear
                      </button>
                      <button className="btn" onClick={onSend} disabled={!chat?.id || busy || (!text.trim() && attachments.length === 0)}>
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
