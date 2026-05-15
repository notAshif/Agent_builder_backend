import { Hono } from "hono";
import { AuthMiddleWare } from "../middleware/auth.middleware.js";
import { ToolController } from "../controller/tool.controller.js";

export const toolRouter = new Hono();

toolRouter.use("*", AuthMiddleWare);

toolRouter.get("/", ToolController.listAll);
toolRouter.get("/:id", ToolController.getById);
toolRouter.post("/", ToolController.create);
