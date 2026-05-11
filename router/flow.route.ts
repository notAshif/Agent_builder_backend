import { Hono } from "hono";
import { AuthMiddleWare } from "../middleware/auth.middleware";
import { FlowService } from "../service/flow.service";
import { sendError, sendSuccess } from "../ultil/response.util";

export const flowRouter = new Hono();

flowRouter.use("*", AuthMiddleWare);

flowRouter.get("/:runId", async (c) => {
    try {
        const { runId } = c.req.param();
        const flow = await FlowService.getFlow(runId);
        return sendSuccess(c, { flow }, "Flow graph fetched", 200);
    } catch (error: any) {
        return sendError(c, error.message ?? "Failed to fetch flow", error.statusCode ?? 500);
    }
});
