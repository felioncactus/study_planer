
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { apiListTasks, apiUpdateTask } from "../api/tasks.api";
import { fetchFriends } from "../api/friends.api";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { formatBytes, renderChatMarkdown } from "../components/chatFormatting";

const EMOJIS = ["😀", "😂", "😍", "🤔", "🔥", "👍", "🎉", "❤️"];
const FORMAT_ACTIONS = [
  { label: "Bold", token: "**bold**", icon: "bold" },
  { label: "Italic", token: "*italic*", icon: "italic" },
  { label: "Heading", token: "# Heading", icon: "heading" },
  { label: "/bot", token: "/bot ", icon: "spark" },
  { label: "/split", token: "/plan ", icon: "split" },
];

function Icon({ name, size = 18, stroke = 1.8, className = "" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    className,
  };

  switch (name) {
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case "message":
      return <svg {...common}><path d="M5 6.5h14a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H9l-5 3v-3H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z" /></svg>;
    case "group":
      return <svg {...common}><path d="M8 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" /><path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z" /><path d="M2.5 20a6 6 0 0 1 11 0" /><path d="M13 19a5 5 0 0 1 8.5-2.5" /></svg>;
    case "self":
      return <svg {...common}><path d="M12 3v18" /><path d="M8 7h7a3 3 0 0 1 0 6H8Z" /><path d="M8 13h8a3 3 0 0 1 0 6H8Z" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
    case "trash":
      return <svg {...common}><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
    case "edit":
      return <svg {...common}><path d="M12 20h9" /><path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z" /></svg>;
    case "paperclip":
      return <svg {...common}><path d="m10.5 13.5 6.2-6.2a3 3 0 1 1 4.2 4.2l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.3-8.3" /></svg>;
    case "image":
      return <svg {...common}><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m5 17 4.5-4.5 3.5 3.5 2-2 4 4" /></svg>;
    case "send":
      return <svg {...common}><path d="m3 12 17-8-4 8 4 8-17-8Z" /><path d="M16 12H3" /></svg>;
    case "spark":
      return <svg {...common}><path d="m12 3 1.9 4.9L19 10l-5.1 2.1L12 17l-1.9-4.9L5 10l5.1-2.1Z" /></svg>;
    case "split":
      return <svg {...common}><path d="M12 5v14" /><path d="M5 8h6" /><path d="M13 16h6" /><path d="m8 5-3 3 3 3" /><path d="m16 13 3 3-3 3" /></svg>;
    case "heading":
      return <svg {...common}><path d="M6 6v12" /><path d="M18 6v12" /><path d="M6 12h12" /></svg>;
    case "bold":
      return <svg {...common}><path d="M8 6h5a3 3 0 1 1 0 6H8Z" /><path d="M8 12h6a3 3 0 1 1 0 6H8Z" /></svg>;
    case "italic":
      return <svg {...common}><path d="M15 4H9" /><path d="M13 20H7" /><path d="m14 4-4 16" /></svg>;
    case "poll":
      return <svg {...common}><path d="M5 18V9" /><path d="M12 18V5" /><path d="M19 18v-7" /></svg>;
    case "timer":
      return <svg {...common}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /><path d="M9 3h6" /></svg>;
    case "back":
      return <svg {...common}><path d="M15 18 9 12l6-6" /></svg>;
    case "close":
      return <svg {...common}><path d="m18 6-12 12" /><path d="m6 6 12 12" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "bot":
      return <svg {...common}><rect x="5" y="8" width="14" height="10" rx="3" /><path d="M9 12h.01" /><path d="M15 12h.01" /><path d="M12 8V5" /><path d="M9 18h6" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></svg>;
    case "users":
      return <svg {...common}><path d="M7.5 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M16.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path d="M2.5 19a5 5 0 0 1 10 0" /><path d="M14 19a4 4 0 0 1 7.5-1.5" /></svg>;
    case "more":
      return <svg {...common}><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>;
    case "compose":
      return <svg {...common}><path d="M12 20h9" /><path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
  }
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function formatChatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatChatDay(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}


function startOfDay(dateLike) {
  const date = new Date(dateLike);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(dateLike) {
  const date = new Date(dateLike);
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(dateLike, days) {
  const date = new Date(dateLike);
  date.setDate(date.getDate() + days);
  return date;
}

function clampTime(value, min, max) {
  return new Date(Math.min(Math.max(value, min), max));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderCommandHighlightMarkup(value = "") {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/(^|[\s(])((?:\/bot|\/plan))(?=\s|$)/gm, '$1<span class="chat-command-token">$2</span>')
    .replace(/\n$/g, "\n ");
}

function formatTaskDueLabel(value) {
  if (!value) return "No due date";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

function createTaskReminderTimeline(task) {
  if (!task?.due_date || task.status === "done") return [];
  const now = Date.now();
  const dueAt = endOfDay(task.due_date).getTime();
  if (Number.isNaN(dueAt)) return [];

  const createdAtRaw = task.created_at ? new Date(task.created_at).getTime() : NaN;
  const createdAt = Number.isNaN(createdAtRaw) ? startOfDay(task.due_date).getTime() - (7 * 24 * 60 * 60 * 1000) : createdAtRaw;
  const totalWindow = Math.max(dueAt - createdAt, 24 * 60 * 60 * 1000);

  const stageSpecs = [
    {
      key: "perfect",
      title: "It is the perfect time to start",
      body: "Starting now keeps this task comfortably on track.",
      time: clampTime(createdAt + totalWindow * 0.18, createdAt + 60 * 60 * 1000, dueAt - 36 * 60 * 60 * 1000).getTime(),
      tone: "accent",
    },
    {
      key: "buffer",
      title: "You still have a little time",
      body: "There is still room to begin without rushing, but the buffer is shrinking.",
      time: clampTime(createdAt + totalWindow * 0.55, createdAt + 4 * 60 * 60 * 1000, dueAt - 18 * 60 * 60 * 1000).getTime(),
      tone: "warning",
    },
    {
      key: "urgent",
      title: "It is almost too late",
      body: "This task is getting close to the deadline. Starting now matters.",
      time: clampTime(dueAt - 8 * 60 * 60 * 1000, createdAt + 8 * 60 * 60 * 1000, dueAt - 30 * 60 * 1000).getTime(),
      tone: "danger",
    },
    {
      key: "late",
      title: "You forgot to do this task",
      body: "The deadline has passed. Re-open it now and decide the next step.",
      time: dueAt + 60 * 60 * 1000,
      tone: "danger",
    },
  ];

  return stageSpecs
    .filter((stage, index, stages) => stage.time <= now && stage.time >= createdAt && (index === 0 || stage.time > stages[index - 1].time))
    .map((stage, index) => ({
      id: `task-reminder-${task.id}-${stage.key}`,
      chat_id: "task-reminders",
      sender_id: null,
      sender_kind: "bot",
      sender_name: "Task reminder bot",
      body: `${stage.title}\n${task.title}`,
      created_at: new Date(stage.time).toISOString(),
      attachments: [],
      metadata: {
        kind: "task_reminder",
        reminder: {
          task_id: task.id,
          task_title: task.title,
          due_date: task.due_date,
          status: task.status,
          stage_key: stage.key,
          stage_title: stage.title,
          stage_body: stage.body,
          tone: stage.tone,
          can_start: task.status !== "doing" && task.status !== "done",
        },
      },
      order: stage.time + index,
    }));
}

function createReminderBotChat(tasks = []) {
  const reminderMessages = tasks
    .flatMap((task) => createTaskReminderTimeline(task))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const lastMessage = reminderMessages[reminderMessages.length - 1] || null;
  const openTasks = tasks.filter((task) => task.status !== "done" && task.due_date).length;

  return {
    id: "task-reminders",
    type: "bot",
    title: "Task reminder bot",
    created_by: null,
    participants: [],
    updated_at: lastMessage?.created_at || new Date().toISOString(),
    unread_count: 0,
    last_message_preview: lastMessage?.metadata?.reminder?.stage_title || (openTasks ? `${openTasks} active task reminder${openTasks === 1 ? "" : "s"}` : "No pending reminders"),
    reminderMessages,
    reminderTaskCount: openTasks,
  };
}

function ChatAvatar({ title, type = "direct" }) {
  const icon = type === "group" ? "group" : type === "self" ? "self" : type === "bot" ? "bot" : "message";
  return (
    <div className={`chat-avatar chat-avatar-${type}`} aria-hidden="true">
      <span className="chat-avatar-fallback">{getInitials(title)}</span>
      <Icon name={icon} size={16} className="chat-avatar-icon" />
    </div>
  );
}

function InlineAttachments({ attachments = [] }) {
  const images = attachments.filter((att) => String(att.mime_type || "").startsWith("image/"));
  const files = attachments.filter((att) => !String(att.mime_type || "").startsWith("image/"));
  return (
    <div className="chat-attachment-stack">
      {images.length ? (
        <div className="chat-attachment-grid">
          {images.map((att) => (
            <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" className="chat-attachment-image-link">
              <img
                src={att.file_url}
                alt={att.original_filename || "chat image"}
                className="chat-attachment-image"
              />
            </a>
          ))}
        </div>
      ) : null}
      {files.length ? (
        <div className="chat-file-list">
          {files.map((att) => (
            <a
              key={att.id}
              href={att.file_url}
              target="_blank"
              rel="noreferrer"
              className="chat-file-link"
            >
              <span className="chat-file-link-main">
                <Icon name="paperclip" size={15} />
                <span>{att.original_filename}</span>
              </span>
              <span className="small muted">{formatBytes(att.size_bytes)}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PollCard({ message, meId, onVoted }) {
  const poll = message?.metadata?.poll || {};
  const options = Array.isArray(poll.options) ? poll.options : [];
  const totals = Array.isArray(poll.totals) ? poll.totals : options.map(() => 0);
  const totalVotes = totals.reduce((sum, value) => sum + Number(value || 0), 0);
  const myVote = Array.isArray(poll.votes) ? poll.votes.find((vote) => String(vote.user_id) === String(meId)) : null;

  return (
    <div className="chat-structured-card">
      <div className="chat-structured-head">
        <span className="chat-structured-icon"><Icon name="poll" size={16} /></span>
        <div>
          <div className="chat-structured-title">{poll.question || message.body}</div>
          <div className="small muted">{totalVotes} vote{totalVotes === 1 ? "" : "s"}</div>
        </div>
      </div>
      <div className="chat-poll-options">
        {options.map((option, index) => {
          const count = Number(totals[index] || 0);
          const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const active = Number(myVote?.option_index) === index;
          return (
            <button
              key={`${option}-${index}`}
              type="button"
              className={`chat-poll-option${active ? " is-active" : ""}`}
              onClick={() => onVoted(index)}
            >
              <span className="chat-poll-progress" style={{ width: `${percent}%` }} />
              <span className="chat-poll-option-row">
                <span>{option}</span>
                <span className="small muted">{count} · {percent}%</span>
              </span>
            </button>
          );
        })}
      </div>
      {myVote ? <div className="small muted">Your vote is highlighted.</div> : null}
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
    <div className="chat-structured-card">
      <div className="chat-structured-head">
        <span className="chat-structured-icon"><Icon name="timer" size={16} /></span>
        <div>
          <div className="chat-structured-title">{timer.title || message.body}</div>
          <div className="small muted">
            {done ? "Finished" : `Time left ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
          </div>
        </div>
      </div>
    </div>
  );
}


function ReminderCard({ message, onStartTask, busy }) {
  const reminder = message?.metadata?.reminder || {};
  const dueLabel = formatTaskDueLabel(reminder.due_date);

  return (
    <div className={`chat-structured-card chat-reminder-card tone-${reminder.tone || "accent"}`}>
      <div className="chat-structured-head">
        <span className="chat-structured-icon"><Icon name="bot" size={16} /></span>
        <div>
          <div className="chat-structured-title">{reminder.stage_title || "Task reminder"}</div>
          <div className="small muted">Due {dueLabel}</div>
        </div>
      </div>

      <div className="chat-reminder-task-title">{reminder.task_title || "Task"}</div>
      {reminder.stage_body ? <div className="small muted">{reminder.stage_body}</div> : null}

      <div className="chat-reminder-actions">
        {reminder.can_start ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onStartTask?.(reminder.task_id)}
            disabled={busy}
          >
            Start to do
          </button>
        ) : (
          <span className="small muted">
            {reminder.status === "doing" ? "Already in progress" : "Task completed"}
          </span>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message, mine, onEdit, onDelete, busy, meId, onPollVote, onStartTask }) {
  const editedAt = message?.metadata?.edited_at;
  const isPoll = message?.metadata?.kind === "poll";
  const isTimer = message?.metadata?.kind === "timer";
  const isReminder = message?.metadata?.kind === "task_reminder";
  const senderLabel = message.sender_kind === "bot" ? "Shared bot" : message.sender_name || "User";

  return (
    <article className={`message-row${mine ? " mine" : ""}`}>
      {!mine ? (
        <div className="message-avatar" aria-hidden="true">
          {message.sender_kind === "bot" ? <Icon name="bot" size={16} /> : getInitials(senderLabel)}
        </div>
      ) : null}

      <div className={`message-bubble${mine ? " mine" : ""}`}>
        <div className="message-meta-row">
          <div className="message-author">
            {message.sender_kind === "bot" ? <Icon name="bot" size={14} /> : null}
            <span>{senderLabel}</span>
          </div>
          <div className="message-meta-actions">
            <time className="small muted" dateTime={message.created_at}>
              {formatChatDay(message.created_at)} · {formatChatTime(message.created_at)}
              {editedAt ? ` · edited ${formatChatTime(editedAt)}` : ""}
            </time>
            {mine ? (
              <div className="message-actions">
                {!isPoll && !isTimer && !isReminder ? (
                  <button className="icon-btn" type="button" onClick={() => onEdit(message)} disabled={busy} aria-label="Edit message">
                    <Icon name="edit" size={15} />
                  </button>
                ) : null}
                <button className="icon-btn" type="button" onClick={() => onDelete(message)} disabled={busy} aria-label="Delete message">
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {isPoll ? (
          <PollCard message={message} meId={meId} onVoted={onPollVote} />
        ) : isTimer ? (
          <TimerCard message={message} />
        ) : isReminder ? (
          <ReminderCard message={message} onStartTask={onStartTask} busy={busy} />
        ) : (
          <>
            <div className="message-body" dangerouslySetInnerHTML={{ __html: renderChatMarkdown(message.body) }} />
            <InlineAttachments attachments={Array.isArray(message.attachments) ? message.attachments : []} />
          </>
        )}
      </div>
    </article>
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
    <section className="chat-sidebar-card">
      <div className="chat-sidebar-title-row">
        <div>
          <h3>Create group</h3>
          <p className="small muted">Start a focused room for assignments, revisions, or project work.</p>
        </div>
        <span className="chat-sidebar-icon"><Icon name="group" size={17} /></span>
      </div>

      <div className="chat-form-grid">
        <label>
          <span className="small">Group name</span>
          <input className="input" placeholder="Semester project team" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <div className="small muted">Choose accepted friends to add.</div>

        <div className="chat-member-picker" role="group" aria-label="Select friends for the group">
          {acceptedFriends.map((friend) => {
            const checked = selected.includes(friend.friend_id);
            return (
              <label key={friend.friend_id} className={`chat-member-option${checked ? " is-selected" : ""}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(friend.friend_id)} />
                <span className="chat-member-avatar" aria-hidden="true">{getInitials(friend.friend_name || friend.friend_email)}</span>
                <span>{friend.friend_name || friend.friend_email}</span>
              </label>
            );
          })}
          {acceptedFriends.length === 0 ? <div className="small muted">Add friends first to create a group.</div> : null}
        </div>

        <button className="btn btn-primary" onClick={submit} disabled={busy || !title.trim() || selected.length === 0}>
          <Icon name="plus" size={16} />
          Create group
        </button>
      </div>
    </section>
  );
}

function DirectChatPicker({ friends, onStart }) {
  return (
    <div className="chat-dialog-list">
      {friends.map((friend) => (
        <button
          key={friend.friend_id}
          type="button"
          className="chat-quick-person"
          onClick={() => onStart(friend.friend_id)}
        >
          <span className="chat-member-avatar" aria-hidden="true">{getInitials(friend.friend_name || friend.friend_email)}</span>
          <span className="chat-quick-person-copy">
            <span>{friend.friend_name || friend.friend_email}</span>
            <span className="small muted">Open direct chat</span>
          </span>
        </button>
      ))}
      {friends.length === 0 ? <div className="small muted">No accepted friends yet.</div> : null}
    </div>
  );
}


function createDefaultPollOptions() {
  return ["Yes", "No"];
}

function PollComposer({ question, options, setQuestion, setOptions, validationError, busy, onSubmit }) {
  function updateOption(index, value) {
    setOptions((curr) => curr.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addOption() {
    setOptions((curr) => [...curr, ""]);
  }

  function removeOption(index) {
    setOptions((curr) => {
      if (curr.length <= 2) return curr;
      return curr.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  return (
    <div className="chat-action-form">
      <label>
        <span className="small">Poll question</span>
        <input
          className="input"
          placeholder="What should we focus on next?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={busy}
        />
      </label>

      <div className="chat-action-options">
        <div className="chat-action-options-head">
          <span className="small">Answer options</span>
          <span className="small muted">Minimum 2 required</span>
        </div>

        <div className="chat-action-option-list">
          {options.map((option, index) => (
            <div key={`poll-option-${index}`} className="chat-action-option-row">
              <span className="chat-action-option-index" aria-hidden="true">
                {index + 1}
              </span>
              <input
                className="input"
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => removeOption(index)}
                disabled={busy || options.length <= 2}
                aria-label={`Remove option ${index + 1}`}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="btn btn-ghost chat-action-add-btn" onClick={addOption} disabled={busy}>
          <Icon name="plus" size={15} />
          Add option
        </button>
      </div>

      {validationError ? <div className="chat-action-validation">{validationError}</div> : null}

      <button type="button" className="btn btn-primary chat-action-submit" onClick={onSubmit} disabled={busy}>
        <Icon name="poll" size={15} />
        Post poll
      </button>
    </div>
  );
}

function TimerComposer({ title, endsAt, setTitle, setEndsAt, validationError, busy, onSubmit }) {
  return (
    <div className="chat-action-form">
      <label>
        <span className="small">Timer title</span>
        <input
          className="input"
          placeholder="Pomodoro sprint"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
      </label>

      <label>
        <span className="small">Ends at</span>
        <input
          className="input"
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          disabled={busy}
        />
      </label>

      {validationError ? <div className="chat-action-validation">{validationError}</div> : null}

      <button type="button" className="btn btn-primary chat-action-submit" onClick={onSubmit} disabled={busy}>
        <Icon name="timer" size={15} />
        Start timer
      </button>
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
  const [tasks, setTasks] = useState([]);
  const [friendsData, setFriendsData] = useState({ accepted: [], pending_inbound: [], pending_outbound: [], blocked: [] });
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [chatSearch, setChatSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editingBody, setEditingBody] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(() => createDefaultPollOptions());
  const [timerTitle, setTimerTitle] = useState("");
  const [timerEndsAt, setTimerEndsAt] = useState("");
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [toolMenuMode, setToolMenuMode] = useState("poll");
  const [toolValidationError, setToolValidationError] = useState("");
  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [chatActionDialog, setChatActionDialog] = useState(null);
  const [mobileComposerOpen, setMobileComposerOpen] = useState(false);

  const bottomRef = useRef(null);
  const messageStreamRef = useRef(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const textAreaRef = useRef(null);
  const toolMenuRef = useRef(null);
  const emojiMenuRef = useRef(null);
  const formatMenuRef = useRef(null);

  const title = useMemo(() => chat?.title || "Chat", [chat]);
  const canDeleteChat = useMemo(() => (!chat ? false : chat.type !== "group" || !chat.created_by || chat.created_by === user?.id), [chat, user?.id]);
  const imagePreviews = useMemo(() => attachments.filter((file) => String(file.type || "").startsWith("image/")), [attachments]);
  const reminderBotChat = useMemo(() => createReminderBotChat(tasks), [tasks]);
  const allChats = useMemo(() => {
    const next = [...chats];
    next.unshift(reminderBotChat);
    return next;
  }, [chats, reminderBotChat]);
  const filteredChats = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();
    if (!query) return allChats;
    return allChats.filter((item) => String(item.title || "").toLowerCase().includes(query));
  }, [allChats, chatSearch]);
  const participantSummary = useMemo(() => {
    if (chat?.type === "bot") return `${chat?.reminderTaskCount || 0} active task reminder${chat?.reminderTaskCount === 1 ? "" : "s"}`;
    if (!Array.isArray(chat?.participants)) return "";
    return chat.participants
      .map((participant) => participant.name || participant.email)
      .filter(Boolean)
      .join(", ");
  }, [chat?.participants]);
  const friendQuickList = useMemo(() => (friendsData.accepted || []).slice(0, 8), [friendsData.accepted]);
  const totalMessageCount = messages.length;
  const selectedChatId = chat?.id || chatId || (friendId === "task-bot" ? "task-reminders" : null);
  const hasSelectedConversation = Boolean(chatId || friendId || chat?.id);
  const isReminderChat = String(chat?.id || chatId || friendId || "") === "task-reminders" || friendId === "task-bot";

  useEffect(() => {
    const nextActiveChatId = chatId || chat?.id || null;
    const nextValue = nextActiveChatId && String(nextActiveChatId) !== "task-reminders" ? String(nextActiveChatId) : null;
    setActiveChatId(nextValue);
    return () => setActiveChatId(null);
  }, [chat?.id, chatId, setActiveChatId]);

  async function refreshSidebar() {
    const [chatData, friendData, taskData] = await Promise.all([fetchChats(), fetchFriends(), apiListTasks()]);
    setChats(chatData.chats || []);
    setFriendsData(friendData);
    setTasks(taskData.tasks || []);
  }

  async function ensureChatSelected() {
    if (chatId && String(chatId) === "task-reminders") {
      setChat(reminderBotChat);
      return reminderBotChat.id;
    }
    if (chatId) {
      const detail = await fetchChat(chatId);
      setChat(detail.chat);
      return detail.chat.id;
    }
    if (friendId === "task-bot") {
      setChat(reminderBotChat);
      navigate(`/conversations/${reminderBotChat.id}`, { replace: true });
      return reminderBotChat.id;
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

  async function refreshMessages(nextChatId = chat?.id) {
    if (!nextChatId) {
      setMessages([]);
      return;
    }
    if (String(nextChatId) === "task-reminders") {
      setMessages(reminderBotChat.reminderMessages || []);
      return;
    }
    const data = await fetchChatMessages(nextChatId);
    setMessages(data.messages || []);
  }

  async function refreshEverything() {
    setError("");
    const ensuredChatId = await ensureChatSelected();
    await Promise.all([refreshSidebar(), refreshMessages(ensuredChatId)]);
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        await refreshEverything();
      } catch (e) {
        if (mounted) {
          setError(e?.response?.data?.error?.message || e?.message || "Failed to load chat");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const unsubscribe = subscribe?.(({ event, data }) => {
      if (event !== "chat.message" && event !== "chat.timer.finished") return;
      const activeChat = chatId || chat?.id;
      if (!activeChat || String(data?.chatId) !== String(activeChat)) return;
      refreshEverything().catch(() => {});
    });

    pollRef.current = window.setInterval(() => {
      refreshEverything().catch(() => {});
    }, 20000);

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [friendId, chatId, chat?.id, subscribe]);

  useEffect(() => {
    setMobileActionsOpen(false);
    setToolMenuOpen(false);
    setChatActionDialog(null);
    setMobileComposerOpen(false);
  }, [chatId, friendId]);

  useEffect(() => {
    if (!isReminderChat) return;
    setChat(reminderBotChat);
    setMessages(reminderBotChat.reminderMessages || []);
  }, [isReminderChat, reminderBotChat]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!toolMenuOpen) return;
      if (toolMenuRef.current?.contains(event.target)) return;
      setToolMenuOpen(false);
    }

    function handleEscape(event) {
      if (event.key === "Escape") setToolMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [toolMenuOpen]);


  useLayoutEffect(() => {
    const scrollToLatestMessage = () => {
      const stream = messageStreamRef.current;
      if (stream) {
        stream.scrollTop = stream.scrollHeight;
        return;
      }
      bottomRef.current?.scrollIntoView({ block: "end" });
    };

    scrollToLatestMessage();
    const frameId = window.requestAnimationFrame(scrollToLatestMessage);
    const timeoutId = window.setTimeout(scrollToLatestMessage, 80);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [selectedChatId, loading, messages.length, messages[messages.length - 1]?.id]);

  useEffect(() => {
    document.body.classList.add("chat-page-active");
    return () => document.body.classList.remove("chat-page-active");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    function updateMobileKeyboardViewport() {
      const viewport = window.visualViewport;
      const visualHeight = viewport?.height || window.innerHeight;
      const keyboardOffset = Math.max(0, window.innerHeight - visualHeight - (viewport?.offsetTop || 0));
      const composerFocused = document.activeElement === textAreaRef.current;
      const keyboardActive = window.matchMedia("(max-width: 900px)").matches && composerFocused && keyboardOffset > 80;

      root.style.setProperty("--chat-visual-height", `${visualHeight}px`);
      root.style.setProperty("--chat-keyboard-offset", `${keyboardOffset}px`);
      body.classList.toggle("chat-keyboard-active", keyboardActive);

      if (keyboardActive) {
        window.requestAnimationFrame(() => {
          const stream = messageStreamRef.current;
          if (stream) stream.scrollTop = stream.scrollHeight;
        });
      }
    }

    updateMobileKeyboardViewport();
    window.visualViewport?.addEventListener("resize", updateMobileKeyboardViewport);
    window.visualViewport?.addEventListener("scroll", updateMobileKeyboardViewport);
    window.addEventListener("resize", updateMobileKeyboardViewport);
    window.addEventListener("focusin", updateMobileKeyboardViewport);
    window.addEventListener("focusout", updateMobileKeyboardViewport);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateMobileKeyboardViewport);
      window.visualViewport?.removeEventListener("scroll", updateMobileKeyboardViewport);
      window.removeEventListener("resize", updateMobileKeyboardViewport);
      window.removeEventListener("focusin", updateMobileKeyboardViewport);
      window.removeEventListener("focusout", updateMobileKeyboardViewport);
      body.classList.remove("chat-keyboard-active");
      root.style.removeProperty("--chat-visual-height");
      root.style.removeProperty("--chat-keyboard-offset");
    };
  }, []);

  async function onSend() {
    if (!chat?.id || isReminderChat) return;
    if (!text.trim() && attachments.length === 0) return;
    const nextText = text;
    const nextFiles = attachments;
    setBusy(true);
    setError("");
    setText("");
    setAttachments([]);
    setMobileComposerOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
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

  function insertComposerText(token) {
    const el = textAreaRef.current;
    if (!el) {
      const value = text || "";
      setText(`${value}${value && !value.endsWith(" ") ? " " : ""}${token}`);
      return;
    }

    const value = text || "";
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const needsLeadingSpace = start > 0 && !/\s/.test(value[start - 1]);
    const insertion = `${needsLeadingSpace ? " " : ""}${token}`;
    const nextValue = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
    const nextCursor = start + insertion.length;

    setText(nextValue);
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function applyWrap(token) {
    insertComposerText(token);
    setFormatMenuOpen(false);
  }

  function insertEmoji(emoji) {
    insertComposerText(emoji);
    setEmojiMenuOpen(false);
  }

  async function handleCreateGroup(payload) {
    try {
      setBusy(true);
      const result = await createGroupChat(payload);
      await refreshSidebar();
      setMobileActionsOpen(false);
      setChatActionDialog(null);
      navigate(`/conversations/${result.chat.id}`);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to create group");
    } finally {
      setBusy(false);
    }
  }

  function handleStartDirectChat(nextFriendId) {
    setMobileActionsOpen(false);
    setChatActionDialog(null);
    navigate(`/chat/${nextFriendId}`);
  }

  async function handleClearChat() {
    if (!chat?.id || !window.confirm(`Clear all messages in "${title}"?`)) return;
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
    if (!chat?.id || !window.confirm(`Delete chat "${title}"? This cannot be undone.`)) return;
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
    setEditingMessage(message);
    setEditingBody(message.body || "");
    setError("");
  }

  function closeEditComposer() {
    if (!busy) {
      setEditingMessage(null);
      setEditingBody("");
    }
  }

  async function submitEditMessage() {
    if (!chat?.id || !editingMessage?.id || !editingBody.trim()) return;
    try {
      setBusy(true);
      setError("");
      await editChatMessage(chat.id, editingMessage.id, { body: editingBody.trim() });
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
    if (!chat?.id || !message?.id || !window.confirm("Delete this message?")) return;
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

  async function handleCreatePoll() {
    if (!chat?.id) return;
    const cleanQuestion = String(pollQuestion || "").trim();
    const options = Array.isArray(pollOptions)
      ? pollOptions.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    if (!cleanQuestion) {
      setToolValidationError("Enter a poll question.");
      return;
    }
    if (options.length < 2) {
      setToolValidationError("Add at least two answer options.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setToolValidationError("");
      await createChatPoll(chat.id, { question: cleanQuestion, options });
      setPollQuestion("");
      setPollOptions(createDefaultPollOptions());
      setToolMenuOpen(false);
      await refreshEverything();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to create poll");
    } finally {
      setBusy(false);
    }
  }

  async function handlePollVote(messageId, optionIndex) {
    if (!chat?.id) return;
    try {
      await voteChatPoll(chat.id, messageId, { optionIndex });
      await refreshMessages(chat.id);
      await refreshSidebar();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to vote");
    }
  }

  async function handleStartTask(taskId) {
    if (!taskId) return;
    try {
      setBusy(true);
      setError("");
      await apiUpdateTask(taskId, { status: "doing" });

      const [chatData, friendData, taskData] = await Promise.all([fetchChats(), fetchFriends(), apiListTasks()]);
      const nextTasks = taskData.tasks || [];
      const nextReminderChat = createReminderBotChat(nextTasks);

      setChats(chatData.chats || []);
      setFriendsData(friendData);
      setTasks(nextTasks);

      if (isReminderChat) {
        setChat(nextReminderChat);
        setMessages(nextReminderChat.reminderMessages || []);
      }
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to start task");
    } finally {
      setBusy(false);
    }
  }


  async function handleCreateTimer() {
    if (!chat?.id) return;
    try {
      setBusy(true);
      setError("");
      await createChatTimer(chat.id, { title: timerTitle, endsAt: timerEndsAt || null });
      setTimerTitle("");
      setTimerEndsAt("");
      await refreshEverything();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to create timer");
    } finally {
      setBusy(false);
    }
  }

  function addFiles(nextFiles) {
    setAttachments((curr) => {
      const existing = new Map(curr.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, file]));
      for (const file of nextFiles || []) {
        existing.set(`${file.name}-${file.size}-${file.lastModified}`, file);
      }
      return Array.from(existing.values());
    });
  }

  function removeAttachment(targetFile) {
    setAttachments((curr) => curr.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== `${targetFile.name}-${targetFile.size}-${targetFile.lastModified}`));
    if (fileInputRef.current && attachments.length <= 1) fileInputRef.current.value = "";
    if (imageInputRef.current && attachments.length <= 1) imageInputRef.current.value = "";
  }

  return (
    <>
      <Navbar />
      <div className={`container chat-page-shell${hasSelectedConversation ? " has-chat-open" : ""}`}>
        <div className={`chat-page-header${hasSelectedConversation ? " has-chat-open" : ""}`}>
          <div>
            <div className="eyebrow">Conversation hub</div>
            <h1 className="chat-page-title">Chat built for actual work.</h1>
            <p className="chat-page-subtitle">
              Keep direct messages, self notes, polls, timers, and shared bot prompts in one calmer workspace.
            </p>
          </div>
          <div className="chat-page-header-actions">
            <Link className="btn btn-ghost" to="/friends">
              <Icon name="back" size={16} />
              Friends
            </Link>
            <button className="btn btn-ghost" type="button" onClick={() => navigate("/chat/self")}>
              <Icon name="self" size={16} />
              Notes to self
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setChatActionDialog("direct")}>
              <Icon name="message" size={16} />
              Start direct chat
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setChatActionDialog("group")}>
              <Icon name="group" size={16} />
              Create group
            </button>
          </div>
        </div>

        <div className={`chat-app-layout${hasSelectedConversation ? " has-chat-open" : ""}`}>
          <aside className={`chat-sidebar${hasSelectedConversation ? " mobile-hidden" : ""}`}>
            <section className="chat-sidebar-card chat-sidebar-primary">
              <div className="chat-sidebar-title-row">
                <div>
                  <h2>Inbox</h2>
                  <p className="small muted">{badge} unread across your space</p>
                </div>
                <div className="chat-sidebar-title-actions">
                  <span className="chat-sidebar-count">{chats.length}</span>
                  <button
                    type="button"
                    className="icon-btn chat-sidebar-mobile-trigger"
                    onClick={() => setMobileActionsOpen(true)}
                    aria-label="Open chat actions"
                    aria-expanded={mobileActionsOpen}
                    aria-controls="chat-mobile-actions"
                  >
                    <Icon name="compose" size={16} />
                    <span>New</span>
                  </button>
                </div>
              </div>

              <label className="chat-search">
                <Icon name="search" size={16} />
                <span className="sr-only">Search chats</span>
                <input
                  type="search"
                  placeholder="Search chats"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                />
              </label>

              <div className="chat-sidebar-list" role="list" aria-label="Conversations">
                {filteredChats.map((item) => {
                  const active = String(item.id) === String(selectedChatId || "");
                  const lastSeen = item.updated_at || item.last_message_at || item.created_at;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`chat-list-item${active ? " is-active" : ""}`}
                      onClick={() => navigate(`/conversations/${item.id}`)}
                    >
                      <ChatAvatar title={item.title} type={item.type} />
                      <span className="chat-list-copy">
                        <span className="chat-list-topline">
                          <span className="chat-list-title">{item.title}</span>
                          <span className="chat-list-time">{formatChatDay(lastSeen)}</span>
                        </span>
                        <span className="chat-list-meta">
                          <span>{item.type === "group" ? "Group room" : item.type === "self" ? "Private notes" : item.type === "bot" ? "Task reminders" : "Direct chat"}</span>
                          {item.unread_count ? <span className="chat-unread-pill">{item.unread_count}</span> : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {filteredChats.length === 0 ? (
                  <div className="chat-empty-panel">
                    <Icon name="message" size={18} />
                    <div>
                      <div>No conversations found.</div>
                      <div className="small muted">Try a different search or start a new chat from your friends list.</div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

          </aside>

          <section className={`chat-stage${hasSelectedConversation ? " mobile-visible" : ""}`}>
            <div className="chat-stage-card">
              <header className="chat-stage-header">
                <div className="chat-stage-identity">
                  <ChatAvatar title={title} type={chat?.type || "direct"} />
                  <div>
                    <h2>{title}</h2>
                    <div className="chat-stage-subcopy">
                      {participantSummary || "Pick a conversation, start a direct chat, or open your self notes."}
                    </div>
                  </div>
                </div>

                <div className="chat-stage-actions">
                  <div className="chat-stage-mobile-top">
                    <button className="btn btn-ghost chat-mobile-back" type="button" onClick={() => navigate("/chat")}>
                      <Icon name="back" size={16} />
                      Chats
                    </button>
                    <button
                      className="btn btn-ghost chat-mobile-menu-trigger"
                      type="button"
                      onClick={() => setMobileActionsOpen(true)}
                      aria-expanded={mobileActionsOpen}
                      aria-controls="chat-mobile-actions"
                    >
                      <Icon name="compose" size={16} />
                      Menu
                    </button>
                  </div>
                  <div className="chat-stage-stats">
                    <span><Icon name="message" size={14} /> {totalMessageCount} messages</span>
                    <span><Icon name="clock" size={14} /> Live updates</span>
                  </div>

                  {chat?.id ? (
                    <div className="chat-stage-buttons">
                      <button className="btn btn-ghost" onClick={handleClearChat} disabled={busy}>
                        <Icon name="trash" size={15} />
                        Clear
                      </button>
                      {canDeleteChat ? (
                        <button className="btn btn-ghost" onClick={handleDeleteChat} disabled={busy}>
                          <Icon name="close" size={15} />
                          Delete
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </header>

              {loading ? (
                <div className="chat-feedback-card">Loading conversation…</div>
              ) : (
                <>
                  {error ? <div className="chat-feedback-card is-error">{error}</div> : null}

                  <div className="chat-tools-strip">
                  </div>

                  <div className="chat-message-stream" ref={messageStreamRef} role="log" aria-live="polite">
                    {!chat?.id ? (
                      <div className="chat-empty-state">
                        <Icon name="message" size={20} />
                        <h3>Select a conversation</h3>
                        <p className="muted">Choose a chat from the left, start a direct chat, or open your notes-to-self thread.</p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="chat-empty-state">
                        <Icon name="spark" size={20} />
                        <h3>This conversation is empty.</h3>
                        <p className="muted">Send a message, paste an image, ask the bot, or create a poll to get things moving.</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          mine={message.sender_id === user?.id && message.sender_kind === "user"}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                          busy={busy}
                          meId={user?.id}
                          onPollVote={(optionIndex) => handlePollVote(message.id, optionIndex)}
                          onStartTask={handleStartTask}
                        />
                      ))
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {editingMessage ? (
                    <div className="modal-backdrop">
                      <div className="modal-card chat-edit-modal">
                        <div className="page-header" style={{ marginTop: 0 }}>
                          <div>
                            <h3 style={{ margin: 0 }}>Edit message</h3>
                            <div className="small muted" style={{ marginTop: 6 }}>
                              Update the content below. Formatting and attachments are preserved.
                            </div>
                          </div>
                          <button className="btn btn-ghost" type="button" onClick={closeEditComposer} disabled={busy}>
                            <Icon name="close" size={15} />
                            Close
                          </button>
                        </div>
                        <div className="chat-form-grid">
                          <textarea className="input" value={editingBody} onChange={(e) => setEditingBody(e.target.value)} rows={6} disabled={busy} placeholder="Edit your message…" />
                          <div className="chat-edit-actions">
                            <button className="btn btn-ghost" type="button" onClick={closeEditComposer} disabled={busy}>Cancel</button>
                            <button className="btn btn-primary" type="button" onClick={submitEditMessage} disabled={busy || !editingBody.trim()}>
                              <Icon name="check" size={15} />
                              Save message
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <footer className="chat-composer">
                    <div className="chat-composer-main">
                      <div className="chat-mobile-compose-row">
                        <button
                          type="button"
                          className={`icon-btn chat-mobile-composer-plus${mobileComposerOpen ? " is-open" : ""}`}
                          onClick={() => {
                            setMobileComposerOpen((current) => !current);
                            setEmojiMenuOpen(false);
                            setFormatMenuOpen(false);
                            setToolMenuOpen(false);
                          }}
                          disabled={!chat?.id || busy || isReminderChat}
                          aria-label="Open message actions"
                          aria-expanded={mobileComposerOpen}
                        >
                          <Icon name="plus" size={17} />
                        </button>

                        <label className="icon-btn chat-mobile-image-btn" aria-label="Attach image">
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => addFiles(Array.from(e.target.files || []))}
                            disabled={!chat?.id || busy || isReminderChat}
                          />
                          <Icon name="image" size={17} />
                        </label>

                        <label className="chat-composer-field">
                          <span className="sr-only">Write a message</span>
                          <div className="chat-compose-shell">
                            <textarea
                              ref={textAreaRef}
                              className="input chat-compose-textarea"
                              placeholder={
                                !chat?.id
                                  ? "Choose a chat to start typing."
                                  : isReminderChat
                                    ? "Task reminder bot is read-only. Use Start to do on a reminder card."
                                    : "Write a message. Press Enter to send."
                              }
                              value={text}
                              onChange={(e) => setText(e.target.value)}
                              onPaste={(event) => {
                                const files = Array.from(event.clipboardData?.files || []).filter((file) => String(file.type || "").startsWith("image/"));
                                if (files.length) addFiles(files);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                  event.preventDefault();
                                  onSend();
                                }
                              }}
                              rows={4}
                              disabled={!chat?.id || busy || isReminderChat}
                            />
                          </div>
                        </label>

                        <button
                          type="button"
                          className="btn btn-primary chat-send-icon-btn"
                          onClick={onSend}
                          disabled={!chat?.id || busy || isReminderChat || (!text.trim() && attachments.length === 0)}
                          aria-label="Send message"
                        >
                          <Icon name="send" size={16} />
                          <span>Send</span>
                        </button>
                      </div>

                      <div className={`chat-composer-footer${mobileComposerOpen ? " is-open" : ""}`}>
                        <div className="chat-composer-status">
                          <div className="chat-inline-menu-wrap" ref={emojiMenuRef}>
                            <button
                              type="button"
                              className={`chat-inline-menu-trigger${emojiMenuOpen ? " is-open" : ""}`}
                              onClick={() => {
                                setEmojiMenuOpen((current) => !current);
                                setFormatMenuOpen(false);
                                setToolMenuOpen(false);
                              }}
                              disabled={!chat?.id || busy || isReminderChat}
                              aria-expanded={emojiMenuOpen}
                              aria-controls="chat-emoji-menu"
                            >
                              <span className="chat-inline-menu-trigger-icon" aria-hidden="true">😀</span>
                              <span>Emojis</span>
                            </button>

                            <div
                              id="chat-emoji-menu"
                              className={`chat-inline-menu-panel${emojiMenuOpen ? " is-open" : ""}`}
                              aria-hidden={!emojiMenuOpen}
                            >
                              <div className="chat-inline-menu-grid" aria-label="Quick emoji">
                                {EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    className="chat-emoji-btn"
                                    type="button"
                                    onClick={() => insertEmoji(emoji)}
                                    disabled={!chat?.id || busy || isReminderChat}
                                    aria-label={`Insert ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="chat-inline-menu-wrap" ref={formatMenuRef}>
                            <button
                              type="button"
                              className={`chat-inline-menu-trigger${formatMenuOpen ? " is-open" : ""}`}
                              onClick={() => {
                                setFormatMenuOpen((current) => !current);
                                setEmojiMenuOpen(false);
                                setToolMenuOpen(false);
                              }}
                              disabled={!chat?.id || busy || isReminderChat}
                              aria-expanded={formatMenuOpen}
                              aria-controls="chat-format-menu"
                            >
                              <span className="chat-inline-menu-trigger-icon" aria-hidden="true">
                                <Icon name="heading" size={16} />
                              </span>
                              <span>Format</span>
                            </button>

                            <div
                              id="chat-format-menu"
                              className={`chat-inline-menu-panel${formatMenuOpen ? " is-open" : ""}`}
                              aria-hidden={!formatMenuOpen}
                            >
                              <div className="chat-inline-menu-list" role="menu" aria-label="Formatting and commands">
                                {FORMAT_ACTIONS.map((action) => (
                                  <button
                                    key={action.label}
                                    className="chat-toolbar-btn chat-inline-menu-item"
                                    type="button"
                                    onClick={() => applyWrap(action.token)}
                                    disabled={!chat?.id || busy || isReminderChat}
                                    title={action.label}
                                    role="menuitem"
                                  >
                                    <Icon name={action.icon} size={15} />
                                    <span>{action.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {chat?.type === "group" && !isReminderChat ? (
                            <div className="chat-special-menu-wrap" ref={toolMenuRef}>
                              <button
                                type="button"
                                className={`chat-special-menu-trigger${toolMenuOpen ? " is-open" : ""}`}
                                onClick={() => {
                                  setToolMenuOpen((current) => !current);
                                  setEmojiMenuOpen(false);
                                  setFormatMenuOpen(false);
                                }}
                                disabled={!chat?.id || busy}
                                aria-expanded={toolMenuOpen}
                                aria-controls="chat-special-menu"
                              >
                                <span className="chat-special-menu-trigger-icon" aria-hidden="true">
                                  <Icon name="plus" size={16} />
                                </span>
                                <span className="chat-special-menu-trigger-copy">
                                  <span>Tools</span>
                                  <span className="small muted">Polls and timers</span>
                                </span>
                              </button>

                              <div
                                id="chat-special-menu"
                                className={`chat-special-menu-panel${toolMenuOpen ? " is-open" : ""}`}
                                aria-hidden={!toolMenuOpen}
                              >
                                <div className="chat-special-menu-header">
                                  <div>
                                    <div className="chat-special-menu-title">Group tools</div>
                                    <div className="small muted">Launch a poll or shared timer without leaving the chat.</div>
                                  </div>
                                  <button
                                    type="button"
                                    className="icon-btn chat-special-menu-close"
                                    onClick={() => setToolMenuOpen(false)}
                                    aria-label="Close group tools"
                                  >
                                    <Icon name="close" size={15} />
                                  </button>
                                </div>

                                <div className="chat-special-menu-tabs" role="tablist" aria-label="Choose a group tool">
                                  <button
                                    type="button"
                                    className={`chat-special-menu-tab${toolMenuMode === "poll" ? " is-active" : ""}`}
                                    onClick={() => { setToolValidationError(""); setToolMenuMode("poll"); }}
                                    role="tab"
                                    aria-selected={toolMenuMode === "poll"}
                                  >
                                    <Icon name="poll" size={15} />
                                    Poll
                                  </button>
                                  <button
                                    type="button"
                                    className={`chat-special-menu-tab${toolMenuMode === "timer" ? " is-active" : ""}`}
                                    onClick={() => { setToolValidationError(""); setToolMenuMode("timer"); }}
                                    role="tab"
                                    aria-selected={toolMenuMode === "timer"}
                                  >
                                    <Icon name="timer" size={15} />
                                    Timer
                                  </button>
                                </div>

                                {toolMenuMode === "poll" ? (
                                  <PollComposer
                                    question={pollQuestion}
                                    options={pollOptions}
                                    setQuestion={setPollQuestion}
                                    setOptions={setPollOptions}
                                    validationError={toolValidationError}
                                    busy={busy}
                                    onSubmit={handleCreatePoll}
                                  />
                                ) : (
                                  <TimerComposer
                                    title={timerTitle}
                                    endsAt={timerEndsAt}
                                    setTitle={setTimerTitle}
                                    setEndsAt={setTimerEndsAt}
                                    validationError={toolValidationError}
                                    busy={busy}
                                    onSubmit={handleCreateTimer}
                                  />
                                )}
                              </div>
                            </div>
                          ) : null}

                          <label className="chat-attach-btn">
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              onChange={(e) => addFiles(Array.from(e.target.files || []))}
                              disabled={!chat?.id || busy || isReminderChat}
                            />
                            <Icon name="paperclip" size={15} />
                            <span>Add files</span>
                          </label>
                          <span className="small muted">{isReminderChat ? "Start tasks directly from reminders in this thread" : attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"} ready` : "Paste or attach files and images"}</span>
                        </div>

                        <div className="chat-composer-submit">
                          <button
                            className="btn btn-ghost"
                            onClick={() => {
                              setText("");
                              setAttachments([]);
                              setMobileComposerOpen(false);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                              if (imageInputRef.current) imageInputRef.current.value = "";
                            }}
                            disabled={busy || isReminderChat || (!text && attachments.length === 0)}
                          >
                            Clear
                          </button>
                          <button className="btn btn-primary" onClick={onSend} disabled={!chat?.id || busy || isReminderChat || (!text.trim() && attachments.length === 0)}>
                            <Icon name="send" size={15} />
                            Send
                          </button>
                        </div>
                      </div>

                      {attachments.length ? (
                        <div className="chat-selected-files" aria-label="Selected attachments">
                          {attachments.map((file) => (
                            <div key={`${file.name}-${file.size}-${file.lastModified}`} className="chat-selected-file">
                              <div className="chat-selected-file-main">
                                <span className="chat-selected-file-thumb" aria-hidden="true">
                                  {String(file.type || "").startsWith("image/") ? "🖼️" : "📎"}
                                </span>
                                <span className="chat-selected-file-copy">
                                  <span>{file.name}</span>
                                  <span className="small muted">{formatBytes(file.size)}</span>
                                </span>
                              </div>
                              <button type="button" className="icon-btn" onClick={() => removeAttachment(file)} aria-label={`Remove ${file.name}`}>
                                <Icon name="close" size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {imagePreviews.length ? (
                        <div className="chat-preview-grid">
                          {imagePreviews.map((file) => (
                            <div key={`${file.name}-${file.size}-${file.lastModified}`} className="chat-preview-card">
                              <img src={URL.createObjectURL(file)} alt={file.name} className="chat-preview-image" />
                              <div className="small muted chat-preview-label">{file.name}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </footer>
                </>
              )}

            </div>
          </section>
        </div>
      </div>

      <div
        className={"chat-mobile-actions-backdrop" + (mobileActionsOpen ? " is-open" : "")}
        hidden={!mobileActionsOpen}
        onClick={() => setMobileActionsOpen(false)}
      />

      {chatActionDialog ? (
        <div className="modal-backdrop chat-action-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setChatActionDialog(null);
        }}>
          <div className="modal-card chat-action-dialog" role="dialog" aria-modal="true" aria-labelledby="chat-action-dialog-title">
            <div className="page-header" style={{ marginTop: 0 }}>
              <div>
                <h3 id="chat-action-dialog-title" style={{ margin: 0 }}>
                  {chatActionDialog === "group" ? "Create group" : "Start direct chat"}
                </h3>
                <div className="small muted" style={{ marginTop: 6 }}>
                  {chatActionDialog === "group" ? "Choose friends and name the room." : "Pick an accepted friend to open a one-to-one thread."}
                </div>
              </div>
              <button className="btn btn-ghost" type="button" onClick={() => setChatActionDialog(null)} disabled={busy}>
                <Icon name="close" size={15} />
                Close
              </button>
            </div>

            {chatActionDialog === "group" ? (
              <GroupCreateCard acceptedFriends={friendsData.accepted || []} onCreate={handleCreateGroup} busy={busy} />
            ) : (
              <DirectChatPicker friends={friendsData.accepted || []} onStart={handleStartDirectChat} />
            )}
          </div>
        </div>
      ) : null}

      <section
        id="chat-mobile-actions"
        className={"chat-mobile-actions-sheet" + (mobileActionsOpen ? " is-open" : "")}
        aria-hidden={!mobileActionsOpen}
        aria-label="Chat actions"
      >
        <div className="chat-mobile-actions-handle" aria-hidden="true" />
        <div className="chat-mobile-actions-header">
          <div>
            <div className="chat-mobile-actions-title">Chat actions</div>
            <div className="small muted">Open self notes or start a new conversation.</div>
          </div>
          <button type="button" className="icon-btn" onClick={() => setMobileActionsOpen(false)} aria-label="Close chat actions">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="chat-mobile-actions-grid">
          <button type="button" className="chat-mobile-action-card" onClick={() => { setMobileActionsOpen(false); navigate("/chat/self"); }}>
            <span className="chat-mobile-action-icon"><Icon name="self" size={17} /></span>
            <span className="chat-mobile-action-copy">
              <span>Notes to self</span>
              <span className="small muted">Private reminders and drafts</span>
            </span>
          </button>

          <button type="button" className="chat-mobile-action-card" onClick={() => { setMobileActionsOpen(false); setChatActionDialog("direct"); }}>
            <span className="chat-mobile-action-icon"><Icon name="message" size={17} /></span>
            <span className="chat-mobile-action-copy">
              <span>Start direct chat</span>
              <span className="small muted">{friendQuickList.length ? "Choose a friend" : "No accepted friends yet"}</span>
            </span>
          </button>

          <button type="button" className="chat-mobile-action-card" onClick={() => { setMobileActionsOpen(false); setChatActionDialog("group"); }}>
            <span className="chat-mobile-action-icon"><Icon name="group" size={17} /></span>
            <span className="chat-mobile-action-copy">
              <span>Create group</span>
              <span className="small muted">Open group setup</span>
            </span>
          </button>
        </div>
      </section>
    </>
  );
}
