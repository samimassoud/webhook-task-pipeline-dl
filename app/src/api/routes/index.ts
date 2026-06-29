// Central router
import { Router } from "express";
import pipelineRoutes from "./pipelines.routes.js";
import jobRoutes from "./jobs.routes.js";
import webhookRoutes from "./webhooks.routes.js";
const router = Router();

router.use("/pipelines", pipelineRoutes);
router.use("/jobs", jobRoutes);
router.use("/webhooks", webhookRoutes);

export default router;