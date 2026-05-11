import { Hono } from "hono";
import { AuthController } from "../controller/auth.controller";
import { AuthMiddleWare } from "../middleware/auth.middleware";

export const authRouter = new Hono();

authRouter.post("/register", AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.post("/oauth/sync", AuthMiddleWare, AuthController.syncOAuthUser);
authRouter.get("/oauth/google", AuthController.getGoogleOAuthUrl);
authRouter.get("/oauth/github", AuthController.getGithubOAuthUrl);
authRouter.post("/refresh", AuthController.refresh);
authRouter.post("/forget-password", AuthController.forgetPassword);
authRouter.post("/reset-password", AuthController.resetPassword);


authRouter.get("/me", AuthMiddleWare ,AuthController.me)
authRouter.post("/logout", AuthMiddleWare ,AuthController.logout)
