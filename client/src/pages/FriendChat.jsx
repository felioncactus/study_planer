import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  clearChat,
  createChatPoll,
  createChatTimer,
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
  voteChatPoll,
} from "../api/chats.api";
import { fetchFriends } from "../api/friends.api";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { formatBytes, renderChatMarkdown } from "../components/chatFormatting";

const EMOJIS = ["😀", "😂", "😍", "🤔", "🔥", "👍", "🎉", "❤️"];

function InlineAttachments({ attachments = [] }) {
  const images = attachments.filter((att) => String(att.mime_type || "").startsWith("image/"));
  const files = attachments.filter((att) => !String(att.mime_type || "").startsWith("image/"));
  return (
    <div style={{ display: "grid", gap: 10, marginTop: attachments.length ? 10 : 0 }}>
      {images.length ? (
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {images.map((att) => (
            <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" style={{ display: "block" }}>
              <img
                src={att.file_url}
                alt={att.original_filename || "chat image"}
                style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 16, border: "1px solid var(--border)" }}
              />
            </a>
          ))}
        </div>
      ) : null}
      {files.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {files.map((att) => (
            <a
              key={att.id}
              href={att.file_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
              style={{ justifyContent: "flex-start" }}
            >
              📎 {att.original_filename}
              <span className="small muted" style={{ marginLeft: 8 }}>{formatBytes(att.size_bytes)}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PollCard({ message, mine, chatId, meId, onVoted }) {
  const poll = message?.metadata?.poll || {};
  const options = Array.isArray(poll.options) ? poll.options : [];
  const totals = Array.isArray(poll.totals) ? poll.totals : options.map(() => 0);
  const totalVotes = totals.reduce((sum, value) => sum + Number(value || 0), 0);
  const myVote = Array.isArray(poll.votes) ? poll.votes.find((vote) => String(vote.user_id) === String(meId)) : null;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 12, background: "var(--surface-soft)" }}>
      <div style={{ fontWeight: 800 }}>📊 {poll.question || message.body}</div>
      <div className="small muted" style={{ marginTop: 4 }}>{totalVotes} vote{totalVotes === 1 ? "" : "s"}</div>
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {options.map((option, index) => {
          const count = Number(totals[index] || 0);
          const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const active = Number(myVote?.option_index) === index;
          return (
            <button
              key={`${option}-${index}`}
              type="button"
              className="btn btn-ghost"
              onClick={() => onVoted(index)}
              style={{
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
                borderColor: active ? "rgba(124,124,255,0.45)" : undefined,
                background: active ? "rgba(124,124,255,0.12)" : undefined,
              }}
            >
              <span style={{ position: "absolute", inset: 0, width: `${percent}%`, background: "rgba(124,124,255,0.14)" }} />
              <span style={{ position: "relative", display: "flex", justifyContent: "space-between", width: "100%", gap: 12 }}>
                <span>{option}</span>
                <span className="small muted">{count} • {percent}%</span>
              </span>
            </button>
          );
        })}
      </div>
      {mine && myVote ? <div className="small muted" style={{ marginTop: 8 }}>Your vote is highlighted.</div> : null}
    </div>
  );
}

function TimerCard({ message }) {
  const timer = message?.metadata?.timer || {};
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);
  const endsAt = new Date(timer.ends_at || 0).getTime();
  const remaining = Math.max(0, endsAt - now);
  const done = !!timer.completed_at || remaining <= 0;
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 12, background: "var(--surface-soft)" }}>
      <div style={{ fontWeight: 800 }}>⏱️ {timer.title || message.body}</div>
      <div className="small muted" style={{ marginTop: 6 }}>
        {done ? "Finished" : `Time left ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
      </div>
    </div>
  );
}

function MessageBubble({ message, mine, onEdit, onDelete, busy, chatId, meId, onPollVote }) {
  const editedAt = message?.metadata?.edited_at;
  const isPoll = message?.metadata?.kind === "poll";
  const isTimer = message?.metadata?.kind === "timer";
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
      <div
        style={{
          width: "min(720px, 100%)",
          padding: 12,
          borderRadius: 20,
          border: mine ? "1px solid rgba(124,124,255,0.28)" : "1px solid var(--border)",
          background: mine ? "linear-gradient(180deg, rgba(124,124,255,0.18), rgba(124,124,255,0.08))" : "var(--card)",
          boxShadow: mine ? "0 14px 34px rgba(124,124,255,0.12)" : "var(--shadow)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div className="small muted">{message.sender_kind === "bot" ? "🤖 Bot" : message.sender_name || "User"}</div>
          {mine ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!isPoll && !isTimer ? <button className="btn btn-ghost" onClick={() => onEdit(message)} disabled={busy}>Edit</button> : null}
              <button className="btn btn-ghost" onClick={() => onDelete(message)} disabled={busy}>Delete</button>
            </div>
          ) : null}
        </div>

        {isPoll ? (
          <PollCard message={message} mine={mine} chatId={chatId} meId={meId} onVoted={onPollVote} />
        ) : isTimer ? (
          <TimerCard message={message} />
        ) : (
          <>
            <div style={{ whiteSpace: "normal", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: renderChatMarkdown(message.body) }} />
            <InlineAttachments attachments={Array.isArray(message.attachments) ? message.attachments : []} />
          </>
        )}

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
  function toggle(id) { setSelected((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id])); }
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
        <button className="btn" onClick={submit} disabled={busy || !title.trim() || selected.length === 0}>Create group</button>
      </div>
    </div>
  );
}

export default function FriendChat() {
  const { friendId, chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribe, setActiveChatId, badge } = useNotifications();

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
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("Yes\nNo");
  const [timerTitle, setTimerTitle] = useState("");
  const [timerEndsAt, setTimerEndsAt] = useState("");

  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);
  const textAreaRef = useRef(null);

  const title = useMemo(() => chat?.title || "Chat", [chat]);
  const canDeleteChat = useMemo(() => !chat ? false : chat.type !== "group" || !chat.created_by || chat.created_by === user?.id, [chat, user?.id]);
  const imagePreviews = useMemo(() => attachments.filter((file) => String(file.type || "").startsWith("image/")), [attachments]);

  useEffect(() => {
    const nextActiveChatId = chatId || chat?.id || null;
    setActiveChatId(nextActiveChatId ? String(nextActiveChatId) : null);
    return () => setActiveChatId(null);
  }, [chat?.id, chatId, setActiveChatId]);

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
    if (!selectedChatId) { setMessages([]); return; }
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
      try { await refreshEverything(); }
      catch (e) { if (mounted) setError(e?.response?.data?.error?.message || e?.message || "Failed to load chat"); }
      finally { if (mounted) setLoading(false); }
    })();

    const unsubscribe = subscribe?.(({ event, data }) => {
      if (event !== "chat.message" && event !== "chat.timer.finished") return;
      const activeChat = chatId || chat?.id;
      if (!activeChat || String(data?.chatId) !== String(activeChat)) return;
      refreshEverything().catch(() => {});
    });

    pollRef.current = setInterval(() => { refreshEverything().catch(() => {}); }, 20000);

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [friendId, chatId, chat?.id, subscribe]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function onSend() {
    if (!chat?.id) return;
    if (!text.trim() && attachments.length === 0) return;
    const nextText = text;
    const nextFiles = attachments;
    setBusy(true); setError(""); setText(""); setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    try { await sendChatMessage(chat.id, { body: nextText, attachments: nextFiles }); await refreshEverything(); }
    catch (e) { setError(e?.response?.data?.error?.message || e?.message || "Failed to send"); setText(nextText); setAttachments(nextFiles); }
    finally { setBusy(false); }
  }

  function applyWrap(token) {
    const value = text || "";
    setText(`${value}${value && !value.endsWith(" ") ? " " : ""}${token}`);
    textAreaRef.current?.focus();
  }

  async function handleCreateGroup(payload) {
    try { setBusy(true); const result = await createGroupChat(payload); await refreshSidebar(); navigate(`/conversations/${result.chat.id}`); }
    catch (e) { setError(e?.response?.data?.error?.message || e?.message || "Failed to create group"); }
    finally { setBusy(false); }
  }

  async function handleClearChat() {
    if (!chat?.id || !window.confirm(`Clear all messages in "${title}"?`)) return;
    try { setBusy(true); setError(""); await clearChat(chat.id); await refreshEverything(); }
    catch (e) { setError(e?.response?.data?.error?.message || e?.message || "Failed to clear chat"); }
    finally { setBusy(false); }
  }

  async function handleDeleteChat() {
    if (!chat?.id || !window.confirm(`Delete chat "${title}"? This cannot be undone.`)) return;
    try {
      setBusy(true); setError(""); await deleteChat(chat.id); await refreshSidebar(); setChat(null); setMessages([]); navigate("/chat", { replace: true });
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to delete chat");
    } finally { setBusy(false); }
  }

  function handleEditMessage(message) { setEditingMessage(message); setEditingBody(message.body || ""); setError(""); }
  function closeEditComposer() { if (!busy) { setEditingMessage(null); setEditingBody(""); } }

  async function submitEditMessage() {
    if (!chat?.id || !editingMessage?.id || !editingBody.trim()) return;
    try { setBusy(true); setError(""); await editChatMessage(chat.id, editingMessage.id, { body: editingBody.trim() }); await refreshMessages(chat.id); await refreshSidebar(); closeEditComposer(); }
    catch (e) { setError(e?.response?.data?.error?.message || e?.message || "Failed to edit message"); }
    finally { setBusy(false); }
  }

  async function handleDeleteMessage(message) {
    if (!chat?.id || !message?.id || !window.confirm("Delete this message?")) return;
    try { setBusy(true); setError(""); await deleteChatMessage(chat.id, message.id); await refreshMessages(chat.id); await refreshSidebar(); }
    catch (e) { setError(e?.response?.data?.error?.message || e?.message || "Failed to delete message"); }
    finally { setBusy(false); }
  }

  async function handleCreatePoll() {
    if (!chat?.id) return;
    const options = pollOptions.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    try {
      setBusy(true); setError("");
      await createChatPoll(chat.id, { question: pollQuestion, options });
      setPollQuestion(""); setPollOptions("Yes\nNo");
      await refreshEverything();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to create poll");
    } finally { setBusy(false); }
  }

  async function handlePollVote(messageId, optionIndex) {
    if (!chat?.id) return;
    try { await voteChatPoll(chat.id, messageId, { optionIndex }); await refreshMessages(chat.id); await refreshSidebar(); }
    catch (e) { setError(e?.response?.data?.error?.message || e?.message || "Failed to vote"); }
  }

  async function handleCreateTimer() {
    if (!chat?.id) return;
    try {
      setBusy(true); setError("");
      await createChatTimer(chat.id, { title: timerTitle, endsAt: timerEndsAt || null });
      setTimerTitle(""); setTimerEndsAt("");
      await refreshEverything();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to create timer");
    } finally { setBusy(false); }
  }

  function addFiles(nextFiles) {
    setAttachments((curr) => {
      const existing = new Map(curr.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, file]));
      for (const file of nextFiles || []) existing.set(`${file.name}-${file.size}-${file.lastModified}`, file);
      return Array.from(existing.values());
    });
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 18, paddingBottom: 32 }}>
        <div className="friend-chat-layout" style={{ display: "grid", gridTemplateColumns: "minmax(280px, 340px) 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 16, position: "sticky", top: 88 }}>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0 }}>Chats</h3>
                <div className="small muted">Unread {badge}</div>
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {chats.map((item) => {
                  const active = String(item.id) === String(chat?.id || chatId || "");
                  return (
                    <button
                      key={item.id}
                      className="btn btn-ghost"
                      style={{ justifyContent: "space-between", borderColor: active ? "rgba(124,124,255,0.35)" : undefined, background: active ? "rgba(124,124,255,0.10)" : undefined }}
                      onClick={() => navigate(`/conversations/${item.id}`)}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.type === "group" ? "👥 " : item.type === "self" ? "📝 " : "💬 "}
                        {item.title}
                      </span>
                      {item.unread_count ? <span className="small muted">{item.unread_count}</span> : null}
                    </button>
                  );
                })}
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
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: 16, borderBottom: "1px solid var(--border)" }}>
                <div>
                  <h2 style={{ margin: 0 }}>{title}</h2>
                  <div className="small muted" style={{ marginTop: 6 }}>{(chat?.participants || []).map((p) => p.name || p.email).join(", ")}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {chat?.id ? (
                    <>
                      <button className="btn btn-ghost" onClick={handleClearChat} disabled={busy}>Clear chat</button>
                      {canDeleteChat ? <button className="btn btn-ghost" onClick={handleDeleteChat} disabled={busy}>Delete chat</button> : null}
                    </>
                  ) : null}
                  <Link className="btn btn-ghost" to="/friends">← Back</Link>
                </div>
              </div>

              {loading ? (
                <div className="card" style={{ margin: 12 }}>Loading…</div>
              ) : (
                <>
                  {error ? <div className="card" style={{ margin: 12, color: "var(--danger)" }}>{error}</div> : null}

                  <div style={{ padding: 12, borderBottom: "1px solid var(--border)", display: "grid", gap: 12, background: "color-mix(in srgb, var(--card-2) 60%, transparent)" }}>
                    {chat?.type === "group" ? (
                      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                        <div className="card" style={{ padding: 12 }}>
                          <div style={{ fontWeight: 800 }}>Create poll</div>
                          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                            <input className="input" placeholder="Poll question" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} disabled={busy} />
                            <textarea className="input" rows={4} placeholder="One option per line" value={pollOptions} onChange={(e) => setPollOptions(e.target.value)} disabled={busy} />
                            <button className="btn btn-ghost" onClick={handleCreatePoll} disabled={busy || !pollQuestion.trim()}>Post poll</button>
                          </div>
                        </div>

                        <div className="card" style={{ padding: 12 }}>
                          <div style={{ fontWeight: 800 }}>Set timer</div>
                          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                            <input className="input" placeholder="Timer title" value={timerTitle} onChange={(e) => setTimerTitle(e.target.value)} disabled={busy} />
                            <input className="input" type="datetime-local" value={timerEndsAt} onChange={(e) => setTimerEndsAt(e.target.value)} disabled={busy} />
                            <button className="btn btn-ghost" onClick={handleCreateTimer} disabled={busy || !timerEndsAt}>Start timer</button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="small muted">
                      Use <code>/bot your question</code> for the shared AI bot. Use <code>/plan ...</code> in a group chat to create participant-specific tasks from a split-task plan.
                    </div>
                  </div>

                  <div style={{ minHeight: "56vh", maxHeight: "56vh", overflow: "auto", padding: 16, display: "grid", gap: 12, background: "linear-gradient(180deg, color-mix(in srgb, var(--card-2) 20%, transparent), transparent)" }}>
                    {!chat?.id ? (
                      <div className="muted">Pick a chat from the left, start a direct chat, or open self chat.</div>
                    ) : messages.length === 0 ? (
                      <div className="muted">No messages yet. Try markdown, polls, timers, image paste, or the shared bot.</div>
                    ) : (
                      messages.map((m) => (
                        <MessageBubble
                          key={m.id}
                          message={m}
                          mine={m.sender_id === user?.id && m.sender_kind === "user"}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                          busy={busy}
                          chatId={chat?.id}
                          meId={user?.id}
                          onPollVote={(optionIndex) => handlePollVote(m.id, optionIndex)}
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
                            <div className="small muted" style={{ marginTop: 6 }}>Update your message in the chat editor instead of the browser prompt.</div>
                          </div>
                          <button className="btn btn-ghost" type="button" onClick={closeEditComposer} disabled={busy}>Close</button>
                        </div>
                        <div style={{ display: "grid", gap: 10 }}>
                          <textarea className="input" value={editingBody} onChange={(e) => setEditingBody(e.target.value)} rows={6} disabled={busy} placeholder="Edit your message…" />
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn btn-ghost" type="button" onClick={closeEditComposer} disabled={busy}>Cancel</button>
                            <button className="btn btn-primary" type="button" onClick={submitEditMessage} disabled={busy || !editingBody.trim()}>Save message</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div style={{ padding: 16, borderTop: "1px solid var(--border)", background: "var(--card)" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      <button className="btn btn-ghost" onClick={() => applyWrap("**bold**")}>Bold</button>
                      <button className="btn btn-ghost" onClick={() => applyWrap("*italic*")}>Italic</button>
                      <button className="btn btn-ghost" onClick={() => applyWrap("# Header")}>Header</button>
                      <button className="btn btn-ghost" onClick={() => applyWrap("/bot ")}>Ask bot</button>
                      <button className="btn btn-ghost" onClick={() => applyWrap("/plan ")}>{chat?.type === "group" ? "Split plan" : "Plan command"}</button>
                      {EMOJIS.map((emoji) => <button key={emoji} className="btn btn-ghost" onClick={() => setText((curr) => `${curr}${emoji}`)}>{emoji}</button>)}
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <textarea
                        ref={textAreaRef}
                        className="input"
                        placeholder="Type a message…"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onPaste={(event) => {
                          const files = Array.from(event.clipboardData?.files || []).filter((file) => String(file.type || "").startsWith("image/"));
                          if (files.length) addFiles(files);
                        }}
                        rows={4}
                        style={{ width: "100%", resize: "vertical" }}
                        disabled={!chat?.id || busy}
                      />
                      {imagePreviews.length ? (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {imagePreviews.map((file) => (
                            <div key={`${file.name}-${file.size}-${file.lastModified}`} className="card" style={{ width: 120, padding: 8 }}>
                              <img src={URL.createObjectURL(file)} alt={file.name} style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 10 }} />
                              <div className="small muted" style={{ marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <input ref={fileInputRef} type="file" multiple onChange={(e) => addFiles(Array.from(e.target.files || []))} disabled={!chat?.id || busy} />
                        <div className="small muted">
                          {attachments.length ? attachments.map((file) => file.name).join(", ") : "Paste or attach files/images"}
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
                        <button className="btn" onClick={onSend} disabled={!chat?.id || busy || (!text.trim() && attachments.length === 0)}>Send</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
