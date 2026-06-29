import { getPipelineById } from "../repositories/queries/pipelines.js";
import { enqueueJobService } from "./jobs.service.js";
import { validateWebhookPayload } from "../api/middleware/validateWebhookPayload.js";

export async function processWebhookService({
    pipelineId,
    payload,
    rawBody
}: {
    pipelineId: string;
    payload: unknown;
    rawBody?: Buffer;
}) {

    if (!rawBody) {
        throw new Error("Missing raw body");
    }

    const pipeline = await getPipelineById(pipelineId);

    if (!pipeline) {
        throw new Error("Pipeline not found");
    }

    // Validate payload based on processor config
    const { eventId } = validateWebhookPayload(pipeline, payload);

    return enqueueJobService({
        pipelineId,
        eventId,
        payload,
    });
}