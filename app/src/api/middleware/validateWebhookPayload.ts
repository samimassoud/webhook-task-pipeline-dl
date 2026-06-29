import { Pipeline } from "../../repositories/schema.js";

import { httpEnrichConfigSchema } from "../../processors/configSchemas/httpEnrich.schema.js";
import { textSummarizeConfigSchema } from "../../processors/configSchemas/textSummarize.schema.js";

export function validateWebhookPayload(
    pipeline: Omit<Pipeline, "signingSecret">,
    payload: unknown
): { eventId: string } {

    if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
    ) {
        throw new Error("Payload must be a JSON object");
    }

    const body = payload as Record<string, unknown>;

    const eventId = body.eventId;

    if (!eventId || typeof eventId !== "string") {
        throw new Error("Webhook payload must include string eventId");
    }

    if (pipeline.processorType === "httpEnrich") {

        const config = httpEnrichConfigSchema.parse(pipeline.config);

        const lookupField = config.lookupField;

        if (!(lookupField in body)) {
            throw new Error(
                `Payload must include lookup field "${lookupField}"`
            );
        }
    }

    if (pipeline.processorType === "jsonTransform") {
        // any JSON payload allowed
    }

    if (pipeline.processorType === "textSummarize") {

        const config = textSummarizeConfigSchema.parse(pipeline.config);

        const inputField = config.inputField;

        if (!(inputField in body)) {
            throw new Error(
                `Payload must include "${inputField}" field`
            );
        }
    }

    return { eventId };
}