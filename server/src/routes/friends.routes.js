import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  acceptFriendHandler,
  blockFriendHandler,
  listFriendsHandler,
  removeFriendHandler,
  requestFriendHandler,
  unblockFriendHandler,
} from "../controllers/friends.controller.js";

export const friendsRouter = Router();

friendsRouter.get("/", requireAuth, listFriendsHandler);
friendsRouter.post("/request", requireAuth, requestFriendHandler);
friendsRouter.post("/accept", requireAuth, acceptFriendHandler);
friendsRouter.delete("/:userId", requireAuth, removeFriendHandler);
friendsRouter.post("/block", requireAuth, blockFriendHandler);
friendsRouter.post("/unblock", requireAuth, unblockFriendHandler);
