// Business Logic
import { NewPipeline, NewSubscription } from "../repositories/schema.js";
import { createPipeline, deletePipeline, getPipelineById, listPipelines, updatePipeline } from "../repositories/queries/pipelines.js";
import { processorRegistry } from "../processors/registry.js";
import { addSubscription, deleteSubscription, getSubscription, getSubscriptionByPipelineAndUrl, listSubscriptions } from "../repositories/queries/subscriptions.js";
import crypto from "crypto";
import { UpdatePipelineInput } from "../types/api.js";

export async function createPipelineService(data: NewPipeline) {
    const processor = processorRegistry[data.processorType];
    if (!processor) {
        throw new Error(`Processor ${data.processorType} is not a valid processor type`);
    }
    const parsedConfig = processor.configSchema.parse(data.config);
    const signingSecret = crypto.randomBytes(32).toString("hex");

    return createPipeline({
        ...data,
        config: parsedConfig,
        signingSecret,
    });
}

export async function listPipelinesService() {
    return listPipelines();
}

export async function getPipelineService(id: string) {
    return getPipelineById(id);
}

export async function updatePipelineService(id: string, data: UpdatePipelineInput) {
    // type UpdatePipelineInput = Omit<Partial<NewPipeline>, "signingSecret">;
    // Prevent updating the signingSecret since it's automatically generated upon creation and only shared with creator
    // or else, a hacker could list pipelines, get the ID and update signingSecret then use it.
    // That's why we always omit it.
    if (Object.keys(data).length === 0) {
        throw new Error("No fields provided for update");
    }
    const existing = await getPipelineById(id);
    if (!existing) {
        throw new Error("Pipeline to be updated was not found");
    }
    // For extra security
    if ("signingSecret" in (data as Record<string, unknown>)) {
        delete (data as Record<string, unknown>).signingSecret;
    }
    // We determine processor type: updated? if not then it's the existing's.
    const processorType = data.processorType ?? existing.processorType;
    const processor = processorRegistry[processorType];
    if (!processor) {
        throw new Error(`Processor ${data.processorType} is not a valid processor type`);
    }
    if (data.config) {
        const parsedConfig = processor.configSchema.parse(data.config);
        data.config = parsedConfig;
    } // If only pipeline's config was updated it's validated against the existing processor type.
    // If both processor type and its config were updated, it's validated against the new processor's type.

    return updatePipeline(id, data);
}

export async function deletePipelineService(id: string) {
    const existing = await getPipelineById(id);

    if (!existing) {
        throw new Error("Pipeline not found");
    }

    // Later to consider adding;
    // I can prevent pipeline's deletion if it has jobs
    // and expose admin api endpoint to delete anyway.

    return deletePipeline(id);
}


export async function listSubscriptionsService(id: string) {
    const existing = await getPipelineById(id);

    if (!existing) {
        console.log("Pipeline wasn't found");
        throw new Error("Pipeline not found");
    }
    return listSubscriptions(id);
}

export async function addSubscriptionService(
    data: NewSubscription
) {
    const existing = await getSubscriptionByPipelineAndUrl(
        data.pipelineId,
        data.callbackUrl
    );

    if (existing) {
        throw new Error("Subscription already exists for this pipeline and callbackUrl");
    }

    return addSubscription(data);
}

export async function deleteSubscriptionService(id: string, subId: string) {
    const existing = await getSubscription(id, subId);

    if (!existing) {
        throw new Error("Subscription not found for this pipeline");
    }
    return deleteSubscription(id, subId);
}