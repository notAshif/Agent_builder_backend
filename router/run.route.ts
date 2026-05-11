import { Hono } from "hono";
import { AuthMiddleWare } from "../middleware/auth.middleware";
import { RunController } from "../controller/run.controller";

export const runRouter = new Hono();

runRouter.use("*", AuthMiddleWare);

runRouter.get("/:id", RunController.getStatus);
runRouter.get("/:id/status", RunController.getStatus);
runRouter.get("/:id/logs", RunController.getLogs);
runRouter.get("/:id/executions", RunController.getExecutions);
runRouter.post("/:id/cancel", RunController.cancel);
runRouter.delete("/:id", RunController.cancel);
