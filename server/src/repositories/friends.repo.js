import { pool } from "../config/db.js";

function pair(a, b) {
  // UUIDs are comparable in Postgres order; we keep a deterministic order.
  return a < b ? [a, b] : [b, a];
}

export function normalizePair(userIdA, userIdB) {
  return pair(userIdA, userIdB);
}

export async function getFriendship(userIdA, userIdB) {
  const [low, high] = pair(userIdA, userIdB);
  const res = await pool.query(
    `SELECT user_low_id, user_high_id, status, requested_by, blocked_by, created_at, updated_at
     FROM friendships
     WHERE user_low_id = $1 AND user_high_id = $2
     LIMIT 1;`,
    [low, high]
  );
  return res.rows[0] || null;
}

export async function upsertFriendRequest(requestedBy, otherUserId) {
  const [low, high] = pair(requestedBy, otherUserId);
  const res = await pool.query(
    `INSERT INTO friendships (user_low_id, user_high_id, status, requested_by, blocked_by)
     VALUES ($1, $2, 'pending', $3, NULL)
     ON CONFLICT (user_low_id, user_high_id)
     DO UPDATE SET
       status = CASE
         WHEN friendships.status = 'blocked' THEN friendships.status
         ELSE 'pending'
       END,
       requested_by = CASE
         WHEN friendships.status = 'blocked' THEN friendships.requested_by
         ELSE EXCLUDED.requested_by
       END,
       blocked_by = CASE
         WHEN friendships.status = 'blocked' THEN friendships.blocked_by
         ELSE NULL
       END
     RETURNING user_low_id, user_high_id, status, requested_by, blocked_by, created_at, updated_at;`,
    [low, high, requestedBy]
  );
  return res.rows[0];
}

export async function acceptFriendRequest(meId, otherUserId) {
  const [low, high] = pair(meId, otherUserId);
  const res = await pool.query(
    `UPDATE friendships
     SET status = 'accepted', blocked_by = NULL
     WHERE user_low_id = $1 AND user_high_id = $2
       AND status = 'pending'
       AND requested_by <> $3
     RETURNING user_low_id, user_high_id, status, requested_by, blocked_by, created_at, updated_at;`,
    [low, high, meId]
  );
  return res.rows[0] || null;
}

export async function deleteFriendship(meId, otherUserId) {
  const [low, high] = pair(meId, otherUserId);
  await pool.query(`DELETE FROM friendships WHERE user_low_id = $1 AND user_high_id = $2;`, [low, high]);
}

export async function blockUser(meId, otherUserId) {
  const [low, high] = pair(meId, otherUserId);
  const res = await pool.query(
    `INSERT INTO friendships (user_low_id, user_high_id, status, requested_by, blocked_by)
     VALUES ($1, $2, 'blocked', $3, $3)
     ON CONFLICT (user_low_id, user_high_id)
     DO UPDATE SET status='blocked', blocked_by=$3
     RETURNING user_low_id, user_high_id, status, requested_by, blocked_by, created_at, updated_at;`,
    [low, high, meId]
  );
  return res.rows[0];
}

export async function listFriendshipsForUser(userId) {
  const res = await pool.query(
    `SELECT f.user_low_id, f.user_high_id, f.status, f.requested_by, f.blocked_by, f.created_at, f.updated_at,
            u.id as friend_id, u.email as friend_email, u.name as friend_name, u.avatar_url as friend_avatar_url
     FROM friendships f
     JOIN users u
       ON u.id = CASE WHEN f.user_low_id = $1 THEN f.user_high_id ELSE f.user_low_id END
     WHERE (f.user_low_id = $1 OR f.user_high_id = $1)
     ORDER BY f.updated_at DESC;`,
    [userId]
  );
  return res.rows;
}

export async function countPendingInboundForUser(userId) {
  const res = await pool.query(
    `SELECT COUNT(*)::int AS c
     FROM friendships f
     WHERE (f.user_low_id = $1 OR f.user_high_id = $1)
       AND f.status = 'pending'
       AND f.requested_by <> $1;`,
    [userId]
  );
  return res.rows[0]?.c || 0;
}
