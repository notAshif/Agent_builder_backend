import { Hono } from "hono";
import { authRouter } from "./auth.route";
import { agentRouter } from "./agent.route";
import { userRouter } from "./user.route";
import { toolRouter } from "./tool.route";
import { runRouter } from "./run.route";
import { flowRouter } from "./flow.route";

export const apiRouter = new Hono();

apiRouter.route("/auth", authRouter);
apiRouter.route("/agents", agentRouter);
apiRouter.route("/users", userRouter);
apiRouter.route("/tools", toolRouter);
apiRouter.route("/runs", runRouter);
apiRouter.route("/flows", flowRouter);
