
import path from "path";
import { pool } from "../config/db.js";

function normalizePair(a, b) {
  return a < b ? [a, b] : [b, a];
}

let chatAttachmentColumnCache = null;
let chatAttachmentFkTargetCache = null;
const tableColumnCache = new Map();

async function getTableColumns(tableName) {
  if (tableColumnCache.has(tableName)) return tableColumnCache.get(tableName);
  const res = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1;`,
    [tableName]
  );
  const columns = new Set(res.rows.map((row) => row.column_name));
  tableColumnCache.set(tableName, columns);
  return columns;
}

async function getChatAttachmentColumns() {
  if (chatAttachmentColumnCache) return chatAttachmentColumnCache;
  chatAttachmentColumnCache = await getTableColumns("chat_message_attachments");
  return chatAttachmentColumnCache;
}

async function getAttachmentMessageTargetTable() {
  if (chatAttachmentFkTargetCache) return chatAttachmentFkTargetCache;
  const res = await pool.query(
    `SELECT ccu.table_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
     WHERE tc.table_schema = 'public'
       AND tc.table_name = 'chat_message_attachments'
       AND tc.constraint_type = 'FOREIGN KEY'
       AND kcu.column_name = 'message_id'
     LIMIT 1;`
  );
  chatAttachmentFkTargetCache = res.rows[0]?.table_name || "chat_messages";
  return chatAttachmentFkTargetCache;
}

function buildAttachmentFileUrlExpression(columns) {
  if (columns.has("file_url") && columns.has("storage_path")) {
    return `COALESCE(
      a.file_url,
      CASE
        WHEN a.storage_path IS NOT NULL AND a.storage_path <> ''
        THEN '/uploads/chat/' || regexp_replace(a.storage_path, '^.*[\\/]', '')
        ELSE NULL
      END
    )`;
  }
  if (columns.has("file_url")) return "a.file_url";
  if (columns.has("storage_path")) {
    return `CASE
      WHEN a.storage_path IS NOT NULL AND a.storage_path <> ''
      THEN '/uploads/chat/' || regexp_replace(a.storage_path, '^.*[\\/]', '')
      ELSE NULL
    END`;
  }
  if (columns.has("stored_path")) {
    return `CASE
      WHEN a.stored_path IS NOT NULL AND a.stored_path <> ''
      THEN '/uploads/chat/' || regexp_replace(a.stored_path, '^.*[\\/]', '')
      ELSE NULL
    END`;
  }
  if (columns.has("path")) {
    return `CASE
      WHEN a.path IS NOT NULL AND a.path <> ''
      THEN '/uploads/chat/' || regexp_replace(a.path, '^.*[\\/]', '')
      ELSE NULL
    END`;
  }
  return "NULL";
}

function buildAttachmentOriginalFilenameExpression(columns) {
  if (columns.has("original_filename") && columns.has("original_name")) {
    return "COALESCE(a.original_filename, a.original_name)";
  }
  if (columns.has("original_filename")) return "a.original_filename";
  if (columns.has("original_name")) return "a.original_name";
  if (columns.has("stored_filename")) return "a.stored_filename";
  if (columns.has("stored_name")) return "a.stored_name";
  return "NULL";
}

function buildAttachmentMimeTypeExpression(columns) {
  return columns.has("mime_type") ? "a.mime_type" : "NULL";
}

function buildAttachmentSizeBytesExpression(columns) {
  return columns.has("size_bytes") ? "a.size_bytes" : "NULL";
}

function buildAttachmentOrderExpression(columns) {
  if (columns.has("created_at")) return "a.created_at ASC";
  return "a.id ASC";
}

async function syncMessageIntoAttachmentTarget(message) {
  const targetTable = await getAttachmentMessageTargetTable();
  if (!targetTable || targetTable === "chat_messages") return;
  const columns = await getTableColumns(targetTable);
  if (!columns.size) return;

  const preferredColumnOrder = [
    "id",
    "chat_id",
    "sender_id",
    "sender_kind",
    "body",
    "metadata",
    "created_at",
  ];
  const insertColumns = preferredColumnOrder.filter((column) => columns.has(column));
  if (!insertColumns.length || !insertColumns.includes("id")) return;

  const rowByColumn = {
    id: message.id,
    chat_id: message.chat_id,
    sender_id: message.sender_id,
    sender_kind: message.sender_kind,
    body: message.body ?? "",
    metadata: JSON.stringify(message.metadata || {}),
    created_at: message.created_at,
  };

  const params = [];
  const placeholders = [];
  let idx = 1;
  for (const column of insertColumns) {
    if (column === "metadata") {
      placeholders.push(`$${idx++}::jsonb`);
    } else {
      placeholders.push(`$${idx++}`);
    }
    params.push(rowByColumn[column] ?? null);
  }

  await pool.query(
    `INSERT INTO ${targetTable} (${insertColumns.join(", ")})
     VALUES (${placeholders.join(", ")})
     ON CONFLICT (id) DO NOTHING;`,
    params
  );
}

async function syncMessageUpdateToAttachmentTarget(messageId, body, metadata) {
  const targetTable = await getAttachmentMessageTargetTable();
  if (!targetTable || targetTable === "chat_messages") return;
  const columns = await getTableColumns(targetTable);
  if (!columns.size) return;

  const sets = [];
  const params = [];
  let idx = 1;

  if (columns.has("body")) {
    sets.push(`body = $${idx++}`);
    params.push(body);
  }
  if (columns.has("metadata")) {
    sets.push(`metadata = $${idx++}::jsonb`);
    params.push(JSON.stringify(metadata || {}));
  }
  if (!sets.length) return;

  params.push(messageId);
  await pool.query(
    `UPDATE ${targetTable}
     SET ${sets.join(", ")}
     WHERE id = $${idx};`,
    params
  );
}

async function syncMessageDeleteToAttachmentTarget(messageId) {
  const targetTable = await getAttachmentMessageTargetTable();
  if (!targetTable || targetTable === "chat_messages") return;
  await pool.query(`DELETE FROM ${targetTable} WHERE id = $1;`, [messageId]);
}

export async function getOrCreateDirectChat(userIdA, userIdB, { type = null, title = null, createdBy = userIdA } = {}) {
  const [low, high] = normalizePair(userIdA, userIdB);
  const existing = await pool.query(
    `SELECT c.id, c.type, c.title, c.created_by, c.created_at, c.updated_at
     FROM chat_direct_links dl
     JOIN chat_conversations c ON c.id = dl.chat_id
     WHERE dl.user_low_id = $1 AND dl.user_high_id = $2
     LIMIT 1;`,
    [low, high]
  );
  if (existing.rows[0]) return existing.rows[0];

  const inferredType = type || (userIdA === userIdB ? "self" : "direct");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO chat_conversations (type, title, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, type, title, created_by, created_at, updated_at;`,
      [inferredType, title, createdBy]
    );
    const chat = inserted.rows[0];
    await client.query(
      `INSERT INTO chat_direct_links (chat_id, user_low_id, user_high_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_low_id, user_high_id) DO NOTHING;`,
      [chat.id, low, high]
    );
    await client.query(
      `INSERT INTO chat_participants (chat_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (chat_id, user_id) DO NOTHING;`,
      [chat.id, low]
    );
    if (high !== low) {
      await client.query(
        `INSERT INTO chat_participants (chat_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (chat_id, user_id) DO NOTHING;`,
        [chat.id, high]
      );
    }
    await client.query("COMMIT");
    return chat;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getChatById(chatId) {
  const res = await pool.query(
    `SELECT id, type, title, created_by, created_at, updated_at
     FROM chat_conversations
     WHERE id = $1
     LIMIT 1;`,
    [chatId]
  );
  return res.rows[0] || null;
}

export async function listParticipantsByChatId(chatId) {
  const res = await pool.query(
    `SELECT cp.chat_id, cp.user_id, cp.joined_at, cp.last_read_at,
            u.email, u.name, u.avatar_url
     FROM chat_participants cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.chat_id = $1
     ORDER BY cp.joined_at ASC, u.name ASC, u.email ASC;`,
    [chatId]
  );
  return res.rows;
}

export async function isParticipant(chatId, userId) {
  const res = await pool.query(
    `SELECT 1
     FROM chat_participants
     WHERE chat_id = $1 AND user_id = $2
     LIMIT 1;`,
    [chatId, userId]
  );
  return Boolean(res.rows[0]);
}

export async function listChatsForUser(userId) {
  const res = await pool.query(
    `SELECT
        c.id,
        c.type,
        c.title,
        c.created_by,
        c.created_at,
        c.updated_at,
        COALESCE(last_message.body, '') AS last_message_body,
        last_message.created_at AS last_message_at,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'id', u.id,
            'email', u.email,
            'name', u.name,
            'avatar_url', u.avatar_url
          ) ORDER BY cp2.joined_at ASC), '[]'::json)
          FROM chat_participants cp2
          JOIN users u ON u.id = cp2.user_id
          WHERE cp2.chat_id = c.id
        ) AS participants,
        (
          SELECT COUNT(*)::int
          FROM chat_messages m2
          WHERE m2.chat_id = c.id
            AND m2.created_at > COALESCE(cp.last_read_at, to_timestamp(0))
            AND (
              (m2.sender_kind = 'user' AND m2.sender_id IS DISTINCT FROM $1)
              OR m2.sender_kind = 'bot'
            )
        ) AS unread_count
     FROM chat_participants cp
     JOIN chat_conversations c ON c.id = cp.chat_id
     LEFT JOIN LATERAL (
       SELECT m.body, m.created_at
       FROM chat_messages m
       WHERE m.chat_id = c.id
       ORDER BY m.created_at DESC
       LIMIT 1
     ) last_message ON TRUE
     WHERE cp.user_id = $1
     ORDER BY COALESCE(last_message.created_at, c.updated_at, c.created_at) DESC, c.created_at DESC;`,
    [userId]
  );
  return res.rows;
}

export async function listMessagesByChatId(chatId, { limit = 200 } = {}) {
  const columns = await getChatAttachmentColumns();
  const attachmentFileUrl = buildAttachmentFileUrlExpression(columns);
  const attachmentOriginalFilename = buildAttachmentOriginalFilenameExpression(columns);
  const attachmentMimeType = buildAttachmentMimeTypeExpression(columns);
  const attachmentSizeBytes = buildAttachmentSizeBytesExpression(columns);
  const attachmentOrder = buildAttachmentOrderExpression(columns);

  const res = await pool.query(
    `SELECT
       m.id,
       m.chat_id,
       m.sender_id,
       m.sender_kind,
       m.body,
       m.created_at,
       m.metadata,
       u.name AS sender_name,
       u.email AS sender_email,
       COALESCE((
         SELECT json_agg(json_build_object(
           'id', a.id,
           'file_url', ${attachmentFileUrl},
           'original_filename', ${attachmentOriginalFilename},
           'mime_type', ${attachmentMimeType},
           'size_bytes', ${attachmentSizeBytes}
         ) ORDER BY ${attachmentOrder})
         FROM chat_message_attachments a
         WHERE a.message_id = m.id
       ), '[]'::json) AS attachments
     FROM chat_messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id = $1
     ORDER BY m.created_at ASC
     LIMIT $2;`,
    [chatId, limit]
  );
  return res.rows;
}

export async function markChatRead(chatId, userId) {
  await pool.query(
    `UPDATE chat_participants
     SET last_read_at = NOW()
     WHERE chat_id = $1 AND user_id = $2;`,
    [chatId, userId]
  );
}

export async function createMessage(chatId, { senderId = null, senderKind = "user", body = "", metadata = {} } = {}) {
  const res = await pool.query(
    `INSERT INTO chat_messages (chat_id, sender_id, sender_kind, body, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, chat_id, sender_id, sender_kind, body, created_at, metadata;`,
    [chatId, senderId, senderKind, body, JSON.stringify(metadata || {})]
  );
  const message = res.rows[0];
  await syncMessageIntoAttachmentTarget(message);
  await touchChat(chatId);
  return message;
}

export async function getMessageById(messageId) {
  const res = await pool.query(
    `SELECT id, chat_id, sender_id, sender_kind, body, created_at, metadata
     FROM chat_messages
     WHERE id = $1
     LIMIT 1;`,
    [messageId]
  );
  return res.rows[0] || null;
}

export async function updateMessage(messageId, { body, metadata = null } = {}) {
  const current = await getMessageById(messageId);
  if (!current) return null;

  const nextMetadata = {
    ...(current.metadata || {}),
    ...(metadata || {}),
    edited_at: new Date().toISOString(),
  };

  const res = await pool.query(
    `UPDATE chat_messages
     SET body = $2,
         metadata = $3::jsonb
     WHERE id = $1
     RETURNING id, chat_id, sender_id, sender_kind, body, created_at, metadata;`,
    [messageId, body, JSON.stringify(nextMetadata)]
  );
  const message = res.rows[0] || null;
  if (message) {
    await syncMessageUpdateToAttachmentTarget(messageId, body, nextMetadata);
    await touchChat(message.chat_id);
  }
  return message;
}

export async function deleteMessageById(messageId) {
  const current = await getMessageById(messageId);
  if (!current) return null;
  await pool.query(`DELETE FROM chat_messages WHERE id = $1;`, [messageId]);
  await syncMessageDeleteToAttachmentTarget(messageId);
  await touchChat(current.chat_id);
  return current;
}

export async function clearChatMessages(chatId) {
  await pool.query(`DELETE FROM chat_messages WHERE chat_id = $1;`, [chatId]);
  const targetTable = await getAttachmentMessageTargetTable();
  if (targetTable && targetTable !== "chat_messages") {
    const targetColumns = await getTableColumns(targetTable);
    if (targetColumns.has("chat_id")) {
      await pool.query(`DELETE FROM ${targetTable} WHERE chat_id = $1;`, [chatId]);
    }
  }
  await touchChat(chatId);
}

export async function deleteChatById(chatId) {
  const targetTable = await getAttachmentMessageTargetTable();
  if (targetTable && targetTable !== "chat_messages") {
    const targetColumns = await getTableColumns(targetTable);
    if (targetColumns.has("chat_id")) {
      await pool.query(`DELETE FROM ${targetTable} WHERE chat_id = $1;`, [chatId]);
    }
  }
  await pool.query(`DELETE FROM chat_conversations WHERE id = $1;`, [chatId]);
}

export async function addAttachments(messageId, attachments) {
  if (!attachments?.length) return [];

  const columns = await getChatAttachmentColumns();
  const hasCreatedAt = columns.has("created_at");

  const preferredColumnOrder = [
    "message_id",
    "user_id",
    "file_url",
    "storage_path",
    "stored_path",
    "path",
    "original_filename",
    "original_name",
    "stored_name",
    "stored_filename",
    "mime_type",
    "size_bytes",
  ];

  const insertColumns = preferredColumnOrder.filter((column) => columns.has(column));
  const values = [];
  const params = [];
  let i = 1;

  for (const att of attachments) {
    const storagePath = att.storage_path ?? null;
    const basename = storagePath ? path.basename(storagePath) : path.basename(att.file_url || "");
    const originalFilename = att.original_filename ?? basename ?? null;
    const fileUrl = att.file_url ?? (basename ? `/uploads/chat/${basename}` : null);

    const rowByColumn = {
      message_id: messageId,
      user_id: null,
      file_url: fileUrl,
      storage_path: storagePath,
      stored_path: storagePath,
      path: storagePath,
      original_filename: originalFilename,
      original_name: originalFilename,
      stored_name: basename ?? originalFilename,
      stored_filename: basename ?? originalFilename,
      mime_type: att.mime_type ?? null,
      size_bytes: att.size_bytes ?? null,
    };

    const rowPlaceholders = [];
    for (const column of insertColumns) {
      rowPlaceholders.push(`$${i++}`);
      params.push(rowByColumn[column] ?? null);
    }
    values.push(`(${rowPlaceholders.join(", ")})`);
  }

  const fileUrlExpr = buildAttachmentFileUrlExpression(columns).replaceAll("a.", "inserted.");
  const originalFilenameExpr = buildAttachmentOriginalFilenameExpression(columns).replaceAll("a.", "inserted.");
  const mimeTypeExpr = buildAttachmentMimeTypeExpression(columns).replaceAll("a.", "inserted.");
  const sizeBytesExpr = buildAttachmentSizeBytesExpression(columns).replaceAll("a.", "inserted.");
  const createdAtExpr = hasCreatedAt ? "inserted.created_at" : "NULL::timestamptz";

  const res = await pool.query(
    `WITH inserted AS (
       INSERT INTO chat_message_attachments (${insertColumns.join(", ")})
       VALUES ${values.join(", ")}
       RETURNING *
     )
     SELECT
       inserted.id,
       ${fileUrlExpr} AS file_url,
       ${originalFilenameExpr} AS original_filename,
       ${mimeTypeExpr} AS mime_type,
       ${sizeBytesExpr} AS size_bytes,
       ${createdAtExpr} AS created_at
     FROM inserted;`,
    params
  );
  return res.rows;
}

export async function createGroupChat({ title, createdBy, participantIds }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO chat_conversations (type, title, created_by)
       VALUES ('group', $1, $2)
       RETURNING id, type, title, created_by, created_at, updated_at;`,
      [title, createdBy]
    );
    const chat = inserted.rows[0];
    const ids = [...new Set(participantIds)];
    for (const userId of ids) {
      await client.query(
        `INSERT INTO chat_participants (chat_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (chat_id, user_id) DO NOTHING;`,
        [chat.id, userId]
      );
    }
    await client.query("COMMIT");
    return chat;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function touchChat(chatId) {
  await pool.query(`UPDATE chat_conversations SET updated_at = NOW() WHERE id = $1;`, [chatId]);
}
