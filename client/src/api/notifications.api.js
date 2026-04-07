import { http } from "./http";

const baseURL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export async function fetchFriendNotifications() {
  const res = await http.get("/notifications/friends");
  return res.data;
}

export function openNotificationsStream({ token, onEvent, onError }) {
  const controller = new AbortController();

  async function connect() {
    try {
      const res = await fetch(`${baseURL}/notifications/stream`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Notification stream failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!controller.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          let eventName = "message";
          const dataLines = [];
          for (const line of rawEvent.split(/\r?\n/)) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim();
            if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
          }

          if (dataLines.length) {
            try {
              const payload = JSON.parse(dataLines.join("\n"));
              onEvent?.({ event: eventName, data: payload });
            } catch {
              // ignore malformed events
            }
          }

          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) onError?.(error);
    }
  }

  connect();

  return {
    close() {
      controller.abort();
    },
  };
}