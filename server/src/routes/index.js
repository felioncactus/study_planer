import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { coursesRouter } from "./courses.routes.js";
import { tasksRouter } from "./tasks.routes.js";
import { assistantRouter } from "./assistant.routes.js";

export const apiRouter = Router();

apiRouter.get("/ping", (req, res) => {
  res.json({ ok: true, message: "api pong" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/courses", coursesRouter);
apiRouter.use("/tasks", tasksRouter);

apiRouter.use("/assistant", assistantRouter);
