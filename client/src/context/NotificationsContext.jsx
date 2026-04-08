/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchFriendNotifications, openNotificationsStream } from "../api/notifications.api";
import { fetchChats } from "../api/chats.api";
import { apiListCalendarEvents } from "../api/calendar.api";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext(null);

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toYmd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function timeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function toastKeyForEvent(event) {
  return `event:${event.id}:${String(event.start)}`;
}

function mapUpcomingEventToToast(event) {
  const kind =
    event?.meta?.blockType === "activity"
      ? "Activity"
      : event?.meta?.blockType === "task"
        ? "Planned task"
        : event.type === "course"
          ? "Course"
          : "Task";
  const when = event.allDay ? "today" : `at ${timeLabel(event.start)}`;
  return {
    id: toastKeyForEvent(event),
    title: `${kind} coming up`,
    message: `${event.title} ${when}`.trim(),
    tone: event?.meta?.blockType === "activity" ? "info" : "accent",
    sticky: false,
  };
}

function mapUnreadChatsToToasts(chats, previousCounts, suppressedChatIds = new Set()) {
  const items = [];
  for (const chat of chats || []) {
    const chatKey = String(chat.id);
    const unread = Number(chat.unread_count || 0);
    const previous = Number(previousCounts.get(chatKey) || 0);
    if (suppressedChatIds.has(chatKey)) continue;
    if (unread > previous) {
      items.push({
        id: `chat:${chat.id}:${unread}`,
        title: "New message",
        message: chat.title || "You received a new message",
        tone: "accent",
        sticky: true,
        actionLabel: "Reply",
        actionHref: `/conversations/${chat.id}`,
      });
    }
  }
  return items;
}

export function NotificationsProvider({ children }) {
  const { token } = useAuth();
  const [badge, setBadge] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const seenRef = useRef(new Set());
  const unreadByChatRef = useRef(new Map());
  const reminderTimersRef = useRef(new Map());
  const listenersRef = useRef(new Set());

  const emitRealtimeEvent = useCallback((payload) => {
    for (const listener of listenersRef.current) {
      try {
        listener(payload);
      } catch {
        // keep other listeners alive
      }
    }
  }, []);

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((curr) => curr.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback((toast) => {
    if (!toast?.id) return;
    if (seenRef.current.has(toast.id)) return;
    seenRef.current.add(toast.id);
    setToasts((curr) => {
      const next = [toast, ...curr.filter((item) => item.id !== toast.id)];
      return next.slice(0, 5);
    });
  }, []);

  const refreshSnapshot = useCallback(async ({ suppressChatToastIds = [], activeChatIdOverride } = {}) => {
    const now = new Date();
    const rangeStart = toYmd(addDays(now, -1));
    const rangeEnd = toYmd(addDays(now, 2));

    const [friendData, chatsData, calendarData] = await Promise.all([
      fetchFriendNotifications(),
      fetchChats(),
      apiListCalendarEvents({ start: rangeStart, end: rangeEnd }),
    ]);

    const chats = chatsData?.chats || [];
    const currentActiveChatId = activeChatIdOverride ?? activeChatId;
     const activeChatKey = currentActiveChatId != null ? String(currentActiveChatId) : null;
    const unreadOutsideActiveChat = chats.reduce((sum, chat) => {
      if (activeChatKey && String(chat.id) === activeChatKey) return sum;
      return sum + Number(chat.unread_count || 0);
    }, 0);
    const nextBadge = Number(friendData?.pendingRequests || 0) + unreadOutsideActiveChat;
    setBadge(nextBadge);

    const suppressedChatIds = new Set(
      [...(suppressChatToastIds || []), currentActiveChatId]
        .filter((id) => id !== null && id !== undefined && id !== "")
        .map((id) => String(id))
    );
    for (const toast of mapUnreadChatsToToasts(chats, unreadByChatRef.current, suppressedChatIds)) {
      pushToast(toast);
    }
    unreadByChatRef.current = new Map(chats.map((chat) => [String(chat.id), Number(chat.unread_count || 0)]));

    for (const timer of reminderTimersRef.current.values()) window.clearTimeout(timer);
    reminderTimersRef.current.clear();

    for (const event of calendarData?.events || []) {
      if (event.allDay) continue;
      if (!["task", "activity"].includes(event?.meta?.blockType)) continue;
      const startsAt = new Date(event.start);
      if (Number.isNaN(startsAt.getTime())) continue;
      const notifyAt = startsAt.getTime() - 15 * 60 * 1000;
      const delay = notifyAt - Date.now();
      if (delay < 0 || delay > 48 * 60 * 60 * 1000) continue;
      const key = toastKeyForEvent(event);
      if (reminderTimersRef.current.has(key)) continue;
      const timer = window.setTimeout(() => {
        pushToast(mapUpcomingEventToToast(event));
        reminderTimersRef.current.delete(key);
      }, delay);
      reminderTimersRef.current.set(key, timer);
    }
  }, [activeChatId, pushToast]);

  useEffect(() => {
    if (!token) {
      setBadge(0);
      setToasts([]);
      setActiveChatId(null);
      seenRef.current = new Set();
      unreadByChatRef.current = new Map();
      for (const timer of reminderTimersRef.current.values()) window.clearTimeout(timer);
      reminderTimersRef.current.clear();
      return;
    }

    let alive = true;
    let pollTimer = null;
    let reconnectTimer = null;
    let stream = null;

    const startStream = () => {
      stream = openNotificationsStream({
        token,
        onEvent: ({ event, data }) => {
          if (!alive) return;
          if (event === "snapshot") {
            setBadge(Number(data?.total || 0));
            return;
          }
          if (event === "chat.timer.finished") {
            pushToast({
              id: `chat-timer:${data?.messageId}:${data?.endsAt}`,
              title: "Group timer finished",
              message: data?.title || "A chat timer has ended",
              tone: "accent",
              sticky: true,
              actionLabel: "Open chat",
              actionHref: `/conversations/${data?.chatId}`,
            });
            return;
          }
          if (event === "chat.message") {
            const incomingChatId = data?.chatId != null ? String(data.chatId) : null;
            const currentActiveChatId = activeChatId != null ? String(activeChatId) : null;
            const isActiveChat = incomingChatId && currentActiveChatId && incomingChatId === currentActiveChatId;

            emitRealtimeEvent({ event, data: { ...data, activeChatOpen: Boolean(isActiveChat) } });
            refreshSnapshot({
              suppressChatToastIds: incomingChatId ? [incomingChatId] : [],
              activeChatIdOverride: currentActiveChatId,
            }).catch(() => {});

            if (data?.incoming && !isActiveChat) {
              pushToast({
                id: `live-chat:${incomingChatId}:${data.messageId}`,
                title: data?.senderName ? `New message from ${data.senderName}` : "New message",
                message: data?.preview || data?.title || "You received a new message",
                tone: "accent",
                sticky: true,
                actionLabel: "Reply",
                actionHref: `/conversations/${incomingChatId}`,
              });
            }
            return;
          }
        },
        onError: () => {
          if (!alive) return;
          reconnectTimer = window.setTimeout(startStream, 2500);
        },
      });
    };

    refreshSnapshot().catch(() => {});
    startStream();
    pollTimer = window.setInterval(() => {
      refreshSnapshot().catch(() => {});
    }, 60000);

    return () => {
      alive = false;
      if (stream) stream.close();
      if (pollTimer) window.clearInterval(pollTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
    };
  }, [activeChatId, emitRealtimeEvent, pushToast, refreshSnapshot, token]);

  useEffect(() => {
    const timers = [];
    for (const toast of toasts) {
      if (toast.sticky) continue;
      timers.push(window.setTimeout(() => dismissToast(toast.id), 7000));
    }
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [dismissToast, toasts]);

  const value = useMemo(
    () => ({ badge, toasts, dismissToast, pushToast, subscribe, activeChatId, setActiveChatId }),
    [activeChatId, badge, dismissToast, pushToast, subscribe, toasts]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <NotificationViewport toasts={toasts} onClose={dismissToast} />
    </NotificationsContext.Provider>
  );
}

function NotificationViewport({ toasts, onClose }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-card ${toast.tone ? `toast-${toast.tone}` : ""}`}>
          <div className="toast-head">
            <div>
              <div className="toast-title">{toast.title}</div>
              <div className="toast-message">{toast.message}</div>
            </div>
            <button type="button" className="toast-close" aria-label="Close notification" onClick={() => onClose(toast.id)}>
              ×
            </button>
          </div>
          {toast.actionHref ? (
            <div className="toast-actions">
              <Link className="btn btn-ghost" to={toast.actionHref}>
                {toast.actionLabel || "Open"}
              </Link>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return ctx;
}