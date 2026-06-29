import { Request, Response } from "express";
import { processWebhookService } from "../../services/webhooks.service.js";
// Handlers parse request and call services
// Not anyone should be able to create jobs on a pipeline
// We'll require X-Signature, 
export async function receiveWebhookHandler(
    req: Request,
    res: Response
) {
    try {
        const pipelineId = req.params.pipelineId as string;
        if (!pipelineId) {
            return res.status(400).json({ error: "Pipeline ID is required" });
        }

        const result = await processWebhookService({
            pipelineId,
            payload: req.body,
            rawBody: req.rawBody
        });

        res.status(202).json(result)

    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}