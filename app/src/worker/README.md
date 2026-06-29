# Worker

This directory contains the background worker process. The API is responsible for accepting webhooks, validating them, and storing jobs in the database. The worker is responsible for everything that happens after a job has been queued:

1. Picking up queued jobs
2. Running the correct processor
3. Storing the result or failure
4. Delivering successful results to all subscribed callback URLs
5. Retrying failed deliveries with backoff
6. Recovering work interrupted by worker crashes

---

## Entry Point

`index.ts` starts two long-running loops concurrently using `Promise.all`:

```ts
await Promise.all([
  runJobWorker(),
  runWebhookWorker(),
]);
```

Neither loop blocks the other. One handles job execution, the other handles outbound delivery.

---

## Architecture

```
Inbound webhook
   ↓
API stores job in database
   ↓
Job worker claims queued job
   ↓
Processor runs and stores result
   ↓
Webhook worker delivers result to subscribers
   ↓
Delivery attempts are logged and retried if needed
```

The database is the durable queue and single source of truth. There is no separate message broker.

---

## Shared Design Pattern

Both loops follow the same structure:

1. Recover any stuck work from a previous crash
2. Atomically claim the next available item
3. Process it
4. Sleep if there is nothing to do

---

## Job Worker

Defined in `jobWorker.ts`. Responsible for processing queued jobs.

### Loop

```ts
while (true) {
  await requeueStuckJobs();
  const job = await claimNextJob();
  if (job) {
    await processJob(job);
  } else {
    await sleep(POLL_INTERVAL_MS);
  }
}
```

### `requeueStuckJobs()`

Resets jobs that are stuck in `processing` — meaning the worker claimed them but crashed before finishing. Any job where `status = 'processing'` and `lockedAt` is older than the lock timeout is reset to `status = 'queued'` with `lockedAt = null`.

### `claimNextJob()`

Atomically claims the oldest queued job using `ORDER BY created_at ASC` with `FOR UPDATE SKIP LOCKED`. This makes the queue FIFO and safe for multiple concurrent worker instances — if two workers poll simultaneously, each will claim a different row.

When a job is claimed it is immediately updated to:

- `status = 'processing'`
- `lockedAt = NOW()`
- `startedAt = NOW()`

The function also loads the associated pipeline's `processorType` and `config`, which are needed for execution.

### `processJob(job)`

Looks up the processor from the registry, calls `processor.run(payload, config)`, and serializes the result through `JSON.parse(JSON.stringify(...))` to ensure it is safe to store.

On success, calls `markJobSuccess`. On any thrown error, calls `markJobFailed`.

### `markJobSuccess(jobId, result)`

Updates the job to:

- `status = 'success'`
- `result = <processed output>`
- `webhookStatus = 'pending'`
- `finishedAt = NOW()`
- `lockedAt = null`

Setting `status` to `success` is what hands the job off to the webhook worker.

### `markJobFailed(jobId, errorMessage)`

Updates the job to:

- `status = 'failed'`
- `errorMessage = <message>`
- `webhookStatus = 'skipped'`
- `finishedAt = NOW()`
- `lockedAt = null`

Failed jobs are not delivered to subscribers.
---

## Webhook Worker

Defined in `webhookWorker.ts`. Responsible for delivering successful job results to pipeline subscribers.

### Loop

```ts
while (true) {
  await requeueStuckWebhooks();
  const job = await claimNextDelivery();
  if (job) {
    await deliverWebhook(job);
  } else {
    await sleep(POLL_INTERVAL_MS);
  }
}
```

### `requeueStuckWebhooks()`

Clears stale delivery locks. If the worker crashed after claiming a job for delivery, that job's `lockedAt` is released so another worker can retry it. Unlike the job worker, there is no status field to reset — only `lockedAt` is cleared.

### `claimNextDelivery()`

Claims the next job where:

- `webhookStatus = 'pending'`
- `status = 'success'`
- `nextWebhookAttemptAt <= NOW()`

Uses `FOR UPDATE SKIP LOCKED` for the same concurrency safety as the job worker. Sets `lockedAt = NOW()` on the claimed row.

### `deliverWebhook(job)`

Loads all subscriptions for the job's pipeline and attempts delivery to each one via `attemptDelivery`. If all succeed, calls `markWebhookDelivered`. If any fail, calls `scheduleRetry`.

**Note on partial failure:** if one subscriber receives the result and another does not, the job is retried, meaning the successful subscriber may receive the same event again. Subscribers are expected to deduplicate using `eventId` they included in the body of the webhook, which is then returned on delivery in `X-Event-Id` header. This is consistent with how most webhook platforms behave.

### `attemptDelivery(job, subscription, pipeline)`

Sends a single outbound POST request.

**Body:**
```json
{
  "eventId": "...",
  "jobId": "...",
  "result": { ... }
}
```

**Headers:**
```
Content-Type: application/json
X-Signature: sha256=<hmac>
X-Event-Id: <eventId>
X-Job-Id: <jobId>
X-Attempt-Number: <n>
```

The request times out after 10 seconds via `AbortSignal.timeout(10_000)`. Every attempt — successful or not — is logged to the `deliveryAttempts` table via `logDeliveryAttempt`. Returns `true` if the response status is 2xx, `false` otherwise.

### `signPayload(payload, secret)`

Computes an HMAC-SHA256 signature over the serialized outbound JSON. Returns the value as `sha256=<hex_digest>`. Subscribers can verify this against their pipeline's signing secret; ensuring data integrity.

### `markWebhookDelivered(jobId)`

Updates the job to `webhookStatus = 'delivered'` and clears `lockedAt`. The delivery lifecycle for that job is complete.

### `scheduleRetry(job)`

Increments `webhookAttempts`, computes `nextWebhookAttemptAt` from the retry schedule, and clears `lockedAt` so the job can be claimed again. If the attempt count has reached the maximum, calls `markWebhookFailed` instead.

### `markWebhookFailed(jobId, attempts)`

Updates the job to `webhookStatus = 'failed'`. The processed result remains stored in the database and is still accessible via the jobs API; asserting hybrid-polling model.

---

## Retry Schedule

| Attempt | Delay |
|---|---|
| 1 | Immediate |
| 2 | 10 seconds |
| 3 | 1 minute |
| 4 | 10 minutes |
| 5 | 1 hour |

Implemented as:

```ts
const RETRY_DELAYS_MS = [0, 10_000, 60_000, 600_000, 3_600_000];
```

---

## Files

| File | Responsibility |
|---|---|
| `index.ts` | Entry point; starts both loops concurrently |
| `jobWorker.ts` | Claims queued jobs, runs processors, stores results |
| `webhookWorker.ts` | Claims pending deliveries, sends results to subscribers, handles retries |
