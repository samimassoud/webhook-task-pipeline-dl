// Handlers parse request and call services
import { Request, Response } from "express";
import { addSubscriptionService, createPipelineService, deletePipelineService, deleteSubscriptionService, getPipelineService, listPipelinesService, listSubscriptionsService, updatePipelineService } from "../../services/pipelines.service.js";
import { validate as isUuid } from "uuid";

export async function createPipelineHandler(req: Request, res: Response) {
    try {
        const pipeline = await createPipelineService(req.body);

        res.status(201).json(pipeline);
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export async function listPipelinesHandler(req: Request, res: Response) {
    const pipelines = await listPipelinesService();

    res.status(200).json(pipelines);
}


export async function getPipelineHandler(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        if (!id) {
            return res.status(400).json({ error: "Pipeline ID is required" });
        }
        const pipeline = await getPipelineService(id);
        res.status(200).json(pipeline);
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }


}

export async function updatePipelineHandler(req: Request, res: Response) {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({ error: "Pipeline ID is required" });
        }

        const pipeline = await updatePipelineService(id, req.body);
        res.status(200).json(pipeline);

    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export async function deletePipelineHandler(req: Request, res: Response) {
    const id = req.params.id as string;

    if (!id) {
        return res.status(400).json({ error: "Pipeline ID is required" });
    }
    if (!isUuid(id)) {
        return res.status(400).json({ error: "Invalid pipeline ID format" });
    }
    try {
        await deletePipelineService(id);
        res.status(204).send();

    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

export async function addSubscriptionHandler(
    req: Request,
    res: Response
) {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({ error: "Pipeline ID is required" });
        }
        const subscriptionData = {
            ...req.body,
            pipelineId: id,
        };

        const subscription = await addSubscriptionService(subscriptionData);
        res.status(201).json(subscription);

    } catch (err) {
        res.status(409).json({ error: (err as Error).message });
    }
}

export async function listSubscriptionsHandler(
    req: Request,
    res: Response
) {
    try {
        const id = req.params.id as string;
        if (!id) {
            return res.status(400).json({ error: "Pipeline ID is required" });
        }

        const subscriptions = await listSubscriptionsService(id);
        res.status(200).json(subscriptions);

    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }

}

export async function deleteSubscriptionHandler(
    req: Request,
    res: Response
) {
    try {
        const id = req.params.id as string;
        const subId = req.params.subId as string;
        if (!id || !isUuid(id)) {
            return res.status(400).json({ error: "Pipeline ID is required" });
        }
        if (!subId || !isUuid(subId)) {
            return res.status(400).json({ error: "Subscription ID is required" });
        }
        await deleteSubscriptionService(id, subId);
        res.status(204).send();

    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

