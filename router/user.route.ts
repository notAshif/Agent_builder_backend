import { Hono } from "hono";
import { AuthMiddleWare } from "../middleware/auth.middleware.js";
import { UserController } from "../controller/user.controller.js";

export const userRouter = new Hono();

userRouter.use("*", AuthMiddleWare);

userRouter.get("/profile", UserController.getProfile);
userRouter.patch("/profile", UserController.updateProfile);
userRouter.get("/api-keys", UserController.listApiKeys);
userRouter.post("/api-keys", UserController.createApiKey);
userRouter.delete("/api-keys/:id", UserController.deleteApiKey);
userRouter.get("/provider-keys", UserController.listProviderKeys);
userRouter.put("/provider-keys/:provider", UserController.upsertProviderKey);
userRouter.delete("/provider-keys/:provider", UserController.deleteProviderKey);
