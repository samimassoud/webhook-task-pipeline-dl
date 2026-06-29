import { Router } from "express";
import { receiveWebhookHandler } from "../handlers/webhooks.handlers.js";
import { validateSignature } from "../middleware/validatesSignature.js";
import { webhookRateLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.route("/:pipelineId")
    .post(
        webhookRateLimiter,
        validateSignature,
        receiveWebhookHandler);

export default router;