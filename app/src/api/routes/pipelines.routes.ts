import { Router } from "express";
import {
    createPipelineHandler,
    listPipelinesHandler,
    getPipelineHandler,
    updatePipelineHandler,
    deletePipelineHandler,
    addSubscriptionHandler,
    listSubscriptionsHandler,
    deleteSubscriptionHandler,
} from "../handlers/pipelines.handlers.js";
import { pipelineRateLimiter } from "../middleware/rateLimiters.js";
import { createPipelineSchema, updatePipelineSchema } from "../../validation/pipelines.schema.js";
import { createSubscriptionSchema } from "../../validation/subscriptions.schema.js";
import { validateBody } from "../middleware/validateRequest.js";
const router = Router();

router.use(pipelineRateLimiter);

router.route("/")
    .post(
        validateBody(createPipelineSchema), // name, processorType and config
        createPipelineHandler)
    .get(listPipelinesHandler);

router.route("/:id")
    .get(getPipelineHandler)
    .patch(
        validateBody(updatePipelineSchema), // optional: name, processorType and config, but nothing else.
        updatePipelineHandler
    )
    .delete(deletePipelineHandler);

router.route("/:id/subscriptions")
    .post(
        validateBody(createSubscriptionSchema), // callbackUrl
        addSubscriptionHandler
    )
    .get(listSubscriptionsHandler);

router.route("/:id/subscriptions/:subId")
    .delete(deleteSubscriptionHandler);

export default router;