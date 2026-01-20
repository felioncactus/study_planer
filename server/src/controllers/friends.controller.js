import { asyncHandler } from "../utils/asyncHandler.js";
import {
  acceptRequest,
  block,
  listMyFriends,
  removeFriendship,
  sendFriendRequest,
  unblock,
} from "../services/friends.service.js";

export const listFriendsHandler = asyncHandler(async (req, res) => {
  const data = await listMyFriends(req.user.id);
  res.json(data);
});

export const requestFriendHandler = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const out = await sendFriendRequest(req.user.id, email);
  res.status(201).json(out);
});

export const acceptFriendHandler = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const out = await acceptRequest(req.user.id, userId);
  res.json(out);
});

export const removeFriendHandler = asyncHandler(async (req, res) => {
  await removeFriendship(req.user.id, req.params.userId);
  res.status(204).send();
});

export const blockFriendHandler = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const out = await block(req.user.id, userId);
  res.json(out);
});

export const unblockFriendHandler = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  await unblock(req.user.id, userId);
  res.status(204).send();
});
