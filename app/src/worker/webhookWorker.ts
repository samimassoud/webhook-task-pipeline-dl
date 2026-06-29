import { db } from "../repositories/db.js";
import { jobs, subscriptions, deliveryAttempts, pipelines, Job, Subscription, Pipeline } from "../repositories/schema.js";
import { eq, and, lte, sql } from "drizzle-orm";
import crypto from "crypto";

// Retry schedule
const RETRY_DELAYS_MS = [0, 10_000, 60_000, 600_000, 3_600_000]; // 0s (immediately),10s,1m,10m,1h

const POLL_INTERVAL_MS = 3000;
const LOCK_TIMEOUT_MS = 180_000; // 3 minutes; here we're delivering to a sub and waiting their response
// unlike when we're just processing a job on our end in the Job Worker.


export async function runWebhookWorker() {
    console.log("Webhook worker started");

    while (true) {
        try {
            await requeueStuckWebhooks();

            const job = await claimNextDelivery() as Job;

            if (job) {
                await deliverWebhook(job);
            } else {
                await sleep(POLL_INTERVAL_MS);
            }

        } catch (err) {
            console.error("Webhook worker error:", err);
            await sleep(POLL_INTERVAL_MS);
        }
    }
}

// Claim next job for delivery
async function claimNextDelivery() {
    const result = await db.execute(sql`
        UPDATE jobs
        SET "locked_at" = NOW()
        WHERE id = (
            SELECT j.id
            FROM jobs j
            WHERE j.webhook_status = 'pending'
              AND j.status = 'success'
              AND j.next_webhook_attempt_at <= NOW()
              AND (j.locked_at IS NULL OR j.locked_at < NOW() - INTERVAL '180 seconds')
            ORDER BY j.created_at ASC
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

    return result[0] || null;
}

// Deliver webhook
async function deliverWebhook(job: Job) {
    // we need to deliver to all subs to that pipeline
    const subs = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.pipelineId, job.pipelineId));
    // we need the pipeline's signingSecret
    const pipeline = await db
        .select()
        .from(pipelines)
        .where(eq(pipelines.id, job.pipelineId))
        .then(res => res[0]);
    if (!pipeline) {
        throw new Error("Pipeline not found for webhook delivery");
    }
    let allSucceeded = true;

    for (const sub of subs) {
        const success = await attemptDelivery(job, sub, pipeline);

        if (!success) {
            allSucceeded = false;
        }
    }

    if (allSucceeded) {
        await markWebhookDelivered(job.id);
    } else {
        // if one sub didn't get delivery, we retry for all
        await scheduleRetry(job);
    }
}

// Attempt delivery to one subscriber
async function attemptDelivery(job: Job, sub: Subscription, pipeline: Pipeline): Promise<boolean> {
    const attemptNumber = job.webhookAttempts + 1;

    try {
        const payloadString = JSON.stringify({
            eventId: job.eventId,
            jobId: job.id,
            result: job.result
        });

        const signature = signPayload(payloadString, pipeline.signingSecret);

        const response = await fetch(sub.callbackUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Signature": signature,
                "X-Event-Id": job.eventId,
                "X-Job-Id": job.id,
                "X-Attempt-Number": String(attemptNumber),
            },
            body: payloadString,
            signal: AbortSignal.timeout(10_000)
        });

        const responseText = await response.text(); // this method call on Response object returned by fetch
        // .text() reads the body of the response as a plain string

        await logDeliveryAttempt({
            jobId: job.id,
            subId: sub.id,
            attemptNumber,
            statusCode: response.status,
            responseBody: responseText
        });

        return response.ok;

    } catch (err: unknown) {
        const errorMessage =
            err instanceof Error ? err.message : String(err);


        await logDeliveryAttempt({
            jobId: job.id,
            subId: sub.id,
            attemptNumber,
            errorMessage: errorMessage
        });

        return false;
    }
}

// Signature
function signPayload(payload: string, secret: string) {
    const hash = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

    return `sha256=${hash}`;
}

// Logging attempts
async function logDeliveryAttempt({
    jobId,
    subId,
    attemptNumber,
    statusCode,
    responseBody,
    errorMessage
}: {
    jobId: string;
    subId: string;
    attemptNumber: number;
    statusCode?: number;
    responseBody?: string;
    errorMessage?: string;
}) {
    await db.insert(deliveryAttempts).values({
        jobId,
        subscriptionId: subId,
        attemptNumber,
        statusCode,
        responseBody,
        errorMessage
    });
}

// Mark delivered
async function markWebhookDelivered(jobId: string) {
    await db.update(jobs)
        .set({
            webhookStatus: "delivered",
            lockedAt: null
        })
        .where(eq(jobs.id, jobId));
}

// Retry logic
async function scheduleRetry(job: Job) {
    const attemptNumber = job.webhookAttempts + 1;

    if (attemptNumber >= RETRY_DELAYS_MS.length) {
        await markWebhookFailed(job.id, attemptNumber);
        return;
    }

    const delay = RETRY_DELAYS_MS[attemptNumber];
    const nextAttempt = new Date(Date.now() + delay);

    await db.update(jobs)
        .set({
            webhookAttempts: attemptNumber,
            nextWebhookAttemptAt: nextAttempt,
            lockedAt: null
        })
        .where(eq(jobs.id, job.id));
}

// Mark failed
async function markWebhookFailed(jobId: string, attempts: number) {
    await db.update(jobs)
        .set({
            webhookStatus: "failed",
            webhookAttempts: attempts,
            lockedAt: null
        })
        .where(eq(jobs.id, jobId));
}

// Requeue stuck jobs
async function requeueStuckWebhooks() {
    await db.update(jobs)
        .set({
            lockedAt: null
        })
        .where(
            and(
                eq(jobs.webhookStatus, "pending"),
                lte(jobs.lockedAt, new Date(Date.now() - LOCK_TIMEOUT_MS))
            )
        );
}

// -----------------------------
function sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}