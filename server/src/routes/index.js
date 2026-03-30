import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { usersRouter } from "./users.routes.js";
import { coursesRouter } from "./courses.routes.js";
import { tasksRouter } from "./tasks.routes.js";
import { assistantRouter } from "./assistant.routes.js";
import { friendsRouter } from "./friends.routes.js";
import { messagesRouter } from "./messages.routes.js";
import { chatsRouter } from "./chats.routes.js";
import { notificationsRouter } from "./notifications.routes.js";
import { calendarRouter } from "./calendar.routes.js";
import { activitiesRouter } from "./activities.routes.js";
import { courseNotesRouter } from "./courseNotes.routes.js";
import { statsRouter } from "./stats.routes.js";

export const apiRouter = Router();

apiRouter.get("/ping", (req, res) => {
  res.json({ ok: true, message: "api pong" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/courses", coursesRouter);
apiRouter.use("/tasks", tasksRouter);

apiRouter.use("/calendar", calendarRouter);
apiRouter.use("/activities", activitiesRouter);
apiRouter.use("/", courseNotesRouter);

apiRouter.use("/friends", friendsRouter);
apiRouter.use("/messages", messagesRouter);
apiRouter.use("/chats", chatsRouter);
apiRouter.use("/notifications", notificationsRouter);

apiRouter.use("/assistant", assistantRouter);
apiRouter.use("/stats", statsRouter);
