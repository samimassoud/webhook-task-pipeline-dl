import { Router } from "express";
import {
    listJobsHandler,
    getJobHandler,
    listJobDeliveriesHandler
} from "../handlers/jobs.handlers.js";
import { jobsRateLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.use(jobsRateLimiter);

router.route("/")
    .get(listJobsHandler);
router.route("/:id")
    .get(getJobHandler);
router.route("/:id/deliveries")
    .get(listJobDeliveriesHandler);

export default router;