import { Hono } from "hono";
import { authRouter } from "./auth.route.js";
import { agentRouter } from "./agent.route.js";
import { userRouter } from "./user.route.js";
import { toolRouter } from "./tool.route.js";
import { runRouter } from "./run.route.js";
import { flowRouter } from "./flow.route.js";
import { eventsRouter } from "./events.route.js";

export const apiRouter = new Hono();

apiRouter.route("/auth", authRouter);
apiRouter.route("/agents", agentRouter);
apiRouter.route("/users", userRouter);
apiRouter.route("/tools", toolRouter);
apiRouter.route("/runs", runRouter);
apiRouter.route("/flows", flowRouter);
apiRouter.route("/events", eventsRouter);
