import "dotenv/config";

import { runJobWorker } from './jobWorker.js';
import { runWebhookWorker } from './webhookWorker.js';

async function main() {
    console.log('Worker process started');

    // Run both loops concurrently — they never block each other
    await Promise.all([
        runJobWorker(),
        runWebhookWorker(),
    ]);
}

main().catch((err) => {
    console.error('Worker crashed:', err);
    process.exit(1);
});