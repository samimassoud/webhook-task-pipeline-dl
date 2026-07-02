// This builds the server instance.
import express from "express";

export function startServer() {
    const app = express();
    // Signature verification must use the exact raw request body
    // app.use(express.json) parses incoming JSON and replaces the body with a JSON object
    // which destroys the original raw byes, meaning we can't reproduce the exact input for HMAC verification.
    app.use(express.json({
        limit: "8kb", // For webhook systems 1MB is more than enough (e.g., GitHub webhooks are usually <100KB)
    })); // the verify middleware helps us capture the raw buffer before express parses it, and store it in req.rawBody.

    app.use("/api/v1/healthz", (req, res) => {
        res.status(200).json({ status: "ok" });
    });

    app.use("/api/v1", (req, res) => {
        res.status(404).json({ error: "Not Found" });
    });

    app.listen(3000, () => {
        console.log("API running on port 3000");
    });
}