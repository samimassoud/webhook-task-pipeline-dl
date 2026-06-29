import { db } from "../repositories/db.js";
import { Job, jobs, pipelines } from "../repositories/schema.js";
import { eq, and, lte, sql } from "drizzle-orm";
import { processorRegistry } from "../processors/registry.js";

const POLL_INTERVAL_MS = 2000;
const LOCK_TIMEOUT_MS = 60_000; // 1 minute

export async function runJobWorker() {
    console.log("Job worker started...");

    while (true) {
        try {
            // Recover stuck jobs
            await requeueStuckJobs(); // This prevents jobs from being lost if a worker crashes mid-execution

            // Claim next job
            const job = await claimNextJob(); // SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1; no collisions.

            if (job) {
                await processJob(job);
            } else {
                await sleep(POLL_INTERVAL_MS); // simple continous polling if not job was yet found.
                // could be updated to sleep until an internal signal is received on the creation of a new job; then it wakes up again.
            }

        } catch (err) {
            console.error("Job worker error:", err);
            await sleep(POLL_INTERVAL_MS);
        }
    }
}

async function requeueStuckJobs() {
    const threshold = new Date(Date.now() - LOCK_TIMEOUT_MS); // jobs been in processing for 1 minute or longer.

    await db.update(jobs)
        .set({
            status: "queued",
            lockedAt: null,
        })
        .where(
            and(
                eq(jobs.status, "processing"),
                lte(jobs.lockedAt, threshold)
            )
        );
}

async function processJob(job: Job & { config: unknown; processorType: string }) {
    try {
        const processor = processorRegistry[job.processorType];

        if (!processor) {
            throw new Error(`Unknown processor: ${job.processorType}`);
        }

        const result = await processor.run(
            job.payload,
            job.config
        ); // Execute processor.

        const safeResult = JSON.parse(JSON.stringify(result)); // Ensuring the processor's output is JSON-safe
        await markJobSuccess(job.id, safeResult);
    } catch (err: unknown) {
        const errorMessage =
            err instanceof Error ? err.message : String(err);

        await markJobFailed(job.id, errorMessage || "Unknown error");
    }
}

export async function markJobSuccess(jobId: string, result: unknown) {
    await db.update(jobs)
        .set({
            status: "success",
            result,
            webhookStatus: "pending",
            finishedAt: new Date(),
            lockedAt: null
        })
        .where(eq(jobs.id, jobId));
}

export async function markJobFailed(jobId: string, errorMessage: string) {
    await db.update(jobs)
        .set({
            status: "failed",
            errorMessage,
            webhookStatus: "skipped",
            finishedAt: new Date(),
            lockedAt: null
        })
        .where(eq(jobs.id, jobId));
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function claimNextJob() {
    // First claim job atomically
    const claimResult = await db.execute(sql`
        UPDATE jobs
        SET status = 'processing',
            locked_at = NOW(),
            started_at = NOW()
        WHERE id = (
            SELECT id FROM jobs
            WHERE status = 'queued'
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        )
        RETURNING 
    id,
    pipeline_id AS "pipelineId",
    event_id AS "eventId",
    payload,
    result,
    status,
    webhook_status AS "webhookStatus",
    webhook_attempts AS "webhookAttempts",
    next_webhook_attempt_at AS "nextWebhookAttemptAt",
    locked_at AS "lockedAt",
    created_at AS "createdAt",
    started_at AS "startedAt",
    finished_at AS "finishedAt";

    `);

    const job = claimResult[0] as Job;

    if (!job) return null;

    // Now fetch pipeline info
    const [pipeline] = await db
        .select({
            processorType: pipelines.processorType,
            config: pipelines.config,
        })
        .from(pipelines)
        .where(eq(pipelines.id, job.pipelineId));

    if (!pipeline) {
        // This should NEVER happen due to FK constraint, but just in case:
        throw new Error("Pipeline not found for claimed job");
    }

    return {
        ...job,
        processorType: pipeline.processorType,
        config: pipeline.config,
    };
}