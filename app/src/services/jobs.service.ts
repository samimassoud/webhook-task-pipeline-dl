interface DatabaseError extends Error {
    code?: string;
}


import { JobStatus } from "../types/jobs.js";
import { createJob, getJobById, listDeliveryAttemptsByJobId, listJobs } from "../repositories/queries/jobs.js";
export async function listJobsService(
    filters?: {
        pipelineId?: string;
        status?: JobStatus;
    }
) {
    return listJobs(filters);
};

export async function getJobService(id: string) {
    const job = await getJobById(id);
    if (!job) {
        throw new Error("Job not found");
    }
    return job;
};

export async function listJobDeliveriesService(jobId: string) {
    const job = await getJobById(jobId);

    if (!job) {
        throw new Error("Job not found");
    }

    return listDeliveryAttemptsByJobId(jobId);
}

export async function enqueueJobService({
    pipelineId,
    eventId,
    payload,
}: { // declare the type of the function's parameter object
    pipelineId: string;
    eventId: string;
    payload: unknown;
}) {

    try {
        const job = await createJob({
            pipelineId,
            payload,
            eventId,
            status: "queued",
            webhookStatus: "pending"
        });

        return { jobId: job.id };
    } catch (err: unknown) {
        const dbErr = err as DatabaseError;
        if (dbErr.code === "23505") {
            // PostgreSQL unique violation error SQLSTATE 23505 https://www.postgresql.org/docs/current/errcodes-appendix.html
            return { jobId: null } // handle gracefully,
            // This means the job already exists, we'll return 202 and avoid duplicates (PER PIPELINE)
        }
        // else:
        throw err
    }
};