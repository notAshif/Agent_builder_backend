import { Hono } from "hono";
import { AuthMiddleWare } from "../middleware/auth.middleware";
import { AgentController } from "../controller/agent.controller";

export const agentRouter = new Hono();

agentRouter.use("*", AuthMiddleWare)

agentRouter.post("/", AgentController.create);
agentRouter.get("/", AgentController.list);
agentRouter.get("/:id", AgentController.getById);
agentRouter.post("/:id/run", AgentController.run);
agentRouter.patch("/:id", AgentController.update);
agentRouter.delete("/:id", AgentController.delete);
agentRouter.post("/:id/tools", AgentController.assignTool);
agentRouter.get("/:id/runs", AgentController.getRuns);
agentRouter.get("/:id/tools", AgentController.getToolById);
agentRouter.delete("/:id/tools/:toolId", AgentController.removeTool);