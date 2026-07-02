// Central router
import { Router } from "express";
import pipelineRoutes from "./pipelines.routes.js";
import jobRoutes from "./jobs.routes.js";
import webhookRoutes from "./webhooks.routes.js";
const router = Router();

router.use("/pipelines", pipelineRoutes);
router.use("/jobs", jobRoutes);
router.use("/webhooks", webhookRoutes);
router.route("/healthz")
    .get((req, res) => {
        res.status(200).json({ status: "ok" });
    });
export default router;