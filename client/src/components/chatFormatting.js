
export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  return html;
}

export function renderChatMarkdown(text) {
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

    if (/^###\s+/.test(line)) {
      flushList();
      parts.push(`<h3>${renderInline(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushList();
      parts.push(`<h2>${renderInline(line.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushList();
      parts.push(`<h1>${renderInline(line.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      listItems.push(`<li>${renderInline(line.replace(/^[-*•]\s+/, ""))}</li>`);
      continue;
    }

    flushList();
    parts.push(`<p>${renderInline(line)}</p>`);
  }

  flushList();
  return parts.join("") || "<p></p>";
}

export function formatBytes(size) {
  const n = Number(size || 0);
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = n;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}
