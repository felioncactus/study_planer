import { completeTimerEvent, listPendingTimerEvents, listParticipantsByChatId } from "../repositories/chats.repo.js";
import { publishUserEventMany } from "./realtime.service.js";

const scheduledTimers = new Map();

function scheduleOne(timer) {
  if (!timer?.message_id) return;
  const key = String(timer.message_id);
  if (scheduledTimers.has(key)) clearTimeout(scheduledTimers.get(key));

  const delay = new Date(timer.ends_at).getTime() - Date.now();
  if (!Number.isFinite(delay) || delay <= 0) return;

  const handle = setTimeout(async () => {
    scheduledTimers.delete(key);
    try {
      const completed = await completeTimerEvent(timer.message_id);
      if (!completed) return;
      const participants = await listParticipantsByChatId(completed.chat_id);
      publishUserEventMany(
        participants.map((p) => p.user_id),
        "chat.timer.finished",
        {
          chatId: completed.chat_id,
          messageId: completed.message_id,
          title: completed.title,
          endsAt: completed.ends_at,
        }
      );
    } catch {
      // noop
    }
  }, delay);

  scheduledTimers.set(key, handle);
}

export async function bootstrapChatTimers() {
  try {
    const timers = await listPendingTimerEvents();
    for (const timer of timers) scheduleOne(timer);
  } catch {
    // noop
  }
}

export function scheduleChatTimer(timer) {
  scheduleOne(timer);
}
