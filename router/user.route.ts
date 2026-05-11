import { Hono } from "hono";
import { AuthMiddleWare } from "../middleware/auth.middleware";
import { UserController } from "../controller/user.controller";

export const userRouter = new Hono();

userRouter.use("*", AuthMiddleWare);

userRouter.get("/profile", UserController.getProfile);
userRouter.patch("/profile", UserController.updateProfile);
userRouter.get("/api-keys", UserController.listApiKeys);
userRouter.post("/api-keys", UserController.createApiKey);
userRouter.delete("/api-keys/:id", UserController.deleteApiKey);
