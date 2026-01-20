import { pool } from "../config/db.js";
import { normalizePair } from "./friends.repo.js";

export async function listMessagesBetween(userId, otherUserId, { limit = 100 } = {}) {
  const [low, high] = normalizePair(userId, otherUserId);
  const res = await pool.query(
    `SELECT id, user_low_id, user_high_id, sender_id, body, created_at, read_at, read_by
     FROM messages
     WHERE user_low_id = $1 AND user_high_id = $2
     ORDER BY created_at ASC
     LIMIT $3;`,
    [low, high, limit]
  );
  return res.rows;
}

export async function createMessage(userId, otherUserId, body) {
  const [low, high] = normalizePair(userId, otherUserId);
  const res = await pool.query(
    `INSERT INTO messages (user_low_id, user_high_id, sender_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_low_id, user_high_id, sender_id, body, created_at, read_at, read_by;`,
    [low, high, userId, body]
  );
  return res.rows[0];
}

export async function markMessagesRead(meId, otherUserId) {
  const [low, high] = normalizePair(meId, otherUserId);
  await pool.query(
    `UPDATE messages
     SET read_at = NOW(), read_by = $3
     WHERE user_low_id = $1 AND user_high_id = $2
       AND sender_id <> $3
       AND read_at IS NULL;`,
    [low, high, meId]
  );
}

export async function countUnreadMessagesForUser(meId) {
  const res = await pool.query(
    `SELECT COUNT(*)::int AS c
     FROM messages m
     JOIN friendships f
       ON f.user_low_id = m.user_low_id AND f.user_high_id = m.user_high_id
     WHERE (m.user_low_id = $1 OR m.user_high_id = $1)
       AND f.status = 'accepted'
       AND m.sender_id <> $1
       AND m.read_at IS NULL;`,
    [meId]
  );
  return res.rows[0]?.c || 0;
}