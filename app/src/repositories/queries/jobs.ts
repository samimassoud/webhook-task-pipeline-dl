import { eq, and, asc } from "drizzle-orm";
import { db } from "../db.js";
import { deliveryAttempts, jobs, NewJob } from "../schema.js";
import { JobStatus } from "src/types/jobs.js";
export async function listJobs(
    filters?: {
        pipelineId?: string;
        status?: JobStatus;
    }
) {
    const conditions = [];
    if (filters?.pipelineId) {
        conditions.push(eq(jobs.pipelineId, filters.pipelineId));
    }
    if (filters?.status) {
        conditions.push(eq(jobs.status, filters.status));
    }
    const result =
        conditions.length > 0
            ? db.select().from(jobs).where(and(...conditions))
            : db.select().from(jobs);
    return result;
}

export async function createJob(data: NewJob) {
    const [job] = await db.insert(jobs)
        .values({
            ...data,
            webhookAttempts: 0
        })
        .returning();
    return job;
}

export async function getJobById(id: string) {
    const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, id));

    return job ?? null;
}

export async function listDeliveryAttemptsByJobId(jobId: string) {
    return db
        .select()
        .from(deliveryAttempts)
        .where(eq(deliveryAttempts.jobId, jobId))
        .orderBy(asc(deliveryAttempts.attemptNumber), asc(deliveryAttempts.attemptedAt));
}