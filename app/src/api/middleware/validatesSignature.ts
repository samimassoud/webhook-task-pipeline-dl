// The goal of this middleware is to
// 1- read the X-Signature header
// 2- Fetch the pipeline's signingSecret
// 3- Compute the HMAC SHA256 of the raw request body
// 4- compare it with the provided (client-produced) signature of the incoming payload
// 5- Reject if they don't match
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getPipelineWithSecret } from "../../repositories/queries/pipelines.js";

export async function validateSignature(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const pipelineId = req.params.pipelineId as string;

        if (!pipelineId) {
            return res.status(400).json({ error: "Pipeline ID is required" });
        }

        const signatureHeader = req.header("X-Signature");

        if (!signatureHeader) {
            return res.status(401).json({ error: "Missing X-Signature header" });
        }

        if (!signatureHeader.startsWith("sha256=")) {
            return res.status(400).json({ error: "Invalid signature format" });
        }

        const receivedSignature = signatureHeader.replace("sha256=", "");

        const pipeline = await getPipelineWithSecret(pipelineId);

        if (!pipeline) {
            return res.status(404).json({ error: "Pipeline not found" });
        }

        const secret = pipeline.signingSecret;
        const rawBody = req.rawBody; // JSON parsing modifies whitespace, which would break signature validation
        // rawBody field is added via a middle ware in src/api/server.ts

        if (!rawBody) {
            return res.status(400).json({ error: "Raw body missing" });
        }

        const computedSignature = crypto
            .createHmac("sha256", secret) // prevents payload tampering
            .update(rawBody)
            .digest("hex");

        const receivedBuffer = Buffer.from(receivedSignature);
        const computedBuffer = Buffer.from(computedSignature);

        if (receivedBuffer.length !== computedBuffer.length) {
            return res.status(403).json({ error: "Invalid signature" });
        } // If buffers are different lengths, timingSafeEqual would throw an error,
        // so we check for that to guard against that exception.

        const signaturesMatch = crypto.timingSafeEqual(
            receivedBuffer,
            computedBuffer
        );
        // Timing attacks is where attackers guess signatures by measuring response time differences
        // and analyze it to derive information about the cryptographic key or the plaintext
        // since normal equality check (===) stops comparing as soon as a mistmatch is found
        // thus time taken to return will vary depending on how many characters matched.
        // crypto.timingSafeEqual compares two buffers in constant time; always taking the same time. Which is our key here.

        if (!signaturesMatch) {
            return res.status(403).json({ error: "Invalid signature" });
        }

        next();
    } catch (err) {
        next(err);
    }
}