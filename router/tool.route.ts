import { Hono } from "hono";
import { AuthMiddleWare } from "../middleware/auth.middleware";
import { ToolController } from "../controller/tool.controller";

export const toolRouter = new Hono();

toolRouter.use("*", AuthMiddleWare);

toolRouter.get("/", ToolController.listAll);
toolRouter.get("/:id", ToolController.getById);
toolRouter.post("/", ToolController.create);
