import { badRequest, forbidden, notFound } from "../utils/httpError.js";
import { findUserByEmail, findUserById } from "../repositories/users.repo.js";
import {
  acceptFriendRequest,
  blockUser,
  deleteFriendship,
  getFriendship,
  listFriendshipsForUser,
  upsertFriendRequest,
} from "../repositories/friends.repo.js";

function isBlocked(row, meId) {
  return row?.status === "blocked";
}

export async function listMyFriends(meId) {
  const rows = await listFriendshipsForUser(meId);
  return {
    accepted: rows.filter((r) => r.status === "accepted"),
    pending_inbound: rows.filter((r) => r.status === "pending" && r.requested_by !== meId),
    pending_outbound: rows.filter((r) => r.status === "pending" && r.requested_by === meId),
    blocked: rows.filter((r) => r.status === "blocked"),
  };
}

export async function getRelationshipWith(meId, otherUserId) {
  const row = await getFriendship(meId, otherUserId);
  if (!row) return null;
  const friend = await findUserById(otherUserId);
  if (!friend) return null;
  return { row, friend };
}

export async function sendFriendRequest(meId, email) {
  if (!email || typeof email !== "string") throw badRequest("email is required");

  const other = await findUserByEmail(email.trim().toLowerCase());
  if (!other) throw notFound("User not found");
  if (other.id === meId) throw badRequest("You can't add yourself");

  const existing = await getFriendship(meId, other.id);
  if (existing?.status === "blocked") {
    if (existing.blocked_by === meId) throw forbidden("Unblock this user first");
    throw forbidden("You are blocked by this user");
  }

  const row = await upsertFriendRequest(meId, other.id);
  return { row, friend: other };
}

export async function acceptRequest(meId, otherUserId) {
  const other = await findUserById(otherUserId);
  if (!other) throw notFound("User not found");
  if (other.id === meId) throw badRequest("Invalid user");

  const updated = await acceptFriendRequest(meId, otherUserId);
  if (!updated) throw badRequest("No pending inbound request found");
  return { row: updated, friend: other };
}

export async function removeFriendship(meId, otherUserId) {
  if (otherUserId === meId) throw badRequest("Invalid user");
  await deleteFriendship(meId, otherUserId);
}

export async function block(meId, otherUserId) {
  const other = await findUserById(otherUserId);
  if (!other) throw notFound("User not found");
  if (other.id === meId) throw badRequest("You can't block yourself");
  const row = await blockUser(meId, otherUserId);
  return { row, friend: other };
}

export async function unblock(meId, otherUserId) {
  const rel = await getFriendship(meId, otherUserId);
  if (!rel) return;
  if (rel.status !== "blocked") return;
  if (rel.blocked_by !== meId) throw forbidden("Only the blocker can unblock");
  await deleteFriendship(meId, otherUserId);
}
