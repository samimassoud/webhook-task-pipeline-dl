# Pipeline Processing API

## Overview

This API enables clients to create and manage event-driven processing pipelines. Each pipeline defines a processing action applied to incoming webhook payloads. Results are delivered asynchronously to one or more registered subscriber URLs.

The system is designed around the following principles:

- **Asynchronous processing** — webhook ingestion returns immediately; processing happens in the background
- **Reliable delivery** — results are always stored regardless of webhook delivery outcome; subscribers can poll if delivery fails
- **Idempotent ingestion** — duplicate webhook submissions with the same `eventId` are deduplicated per pipeline
- **Secure delivery** — all outbound webhook deliveries are signed with HMAC-SHA256

---

## Base URL

```
http://localhost:3000/api/v1
```

---

## Global Constraints

### Request Body Size

All endpoints enforce a maximum request body size of **1 MB**. Requests exceeding this limit are rejected with `413 Payload Too Large`.

### Rate Limits

Rate limits are enforced per IP address.

| Route prefix | Limit |
|---|---|
| `/webhooks/*` | 100 requests per minute |
| `/pipelines/*` | 30 requests per minute |
| `/jobs/*` | 60 requests per minute |

Requests exceeding the limit receive a `429 Too Many Requests` response.

---

## Authentication

Webhook ingestion requests must be authenticated using an HMAC-SHA256 signature. The signature is computed over the raw request body using the pipeline's `signingSecret`, which is returned once at pipeline creation time.

### Required Header

```
X-Signature: sha256=<hmac_sha256_hex>
```

### Signature Computation (Postman Pre-request Script)

```javascript
const secret = pm.environment.get("SIGNING_SECRET");
const rawBody = pm.request.body.raw;
const signature = CryptoJS.HmacSHA256(rawBody, secret).toString();
pm.request.headers.upsert({
    key: "X-Signature",
    value: `sha256=${signature}`
});
```

Requests with a missing or invalid signature are rejected with `401 Unauthorized`.

---

## Processors

A processor defines the transformation applied to a webhook payload. When creating a pipeline, you specify a `processorType` and a `config` object whose shape depends on the chosen processor.

The three available processor types are: `httpEnrich`, `jsonTransform`, and `textSummarize`.

---

### httpEnrich

Looks up a field value from the incoming payload against an external HTTP API and merges the response into the result.

#### Config Schema

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `lookupField` | string | Yes | — | The payload field whose value is used for the lookup |
| `enrichUrl` | string (URL) | Yes | — | Must be a valid URL and must contain the `{value}` placeholder |
| `mergeKey` | string | No | `"enrichment"` | Key under which the enrichment response is merged into the result |
| `timeoutMs` | integer | No | `5000` | Maximum wait time for the external call; must be between 1 and 10000 (ms) |

#### Config Example

```json
{
  "lookupField": "ip",
  "enrichUrl": "https://api.ipinfo.io/lite/{value}?token=YOUR_TOKEN",
  "mergeKey": "geoData",
  "timeoutMs": 5000
}
```

The `{value}` placeholder in `enrichUrl` is replaced at runtime with the value of `lookupField` from the incoming payload.

---

### jsonTransform

Restructures a JSON payload by extracting fields, renaming keys, and adding computed or static fields. At least one of `extract`, `rename`, or `addFields` must be provided.

#### Config Schema

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `extract` | string[] | No* | — | Dot-notation paths to extract from the payload (e.g. `"user.email"`) |
| `rename` | object | No* | — | Map of dot-notation source paths to new key names (e.g. `{"user.email": "email"}`) |
| `addFields` | object | No* | — | Static or computed fields to add; values may be strings, numbers, or booleans. Use `"__now__"` as a value to inject the current ISO timestamp. |

*At least one of `extract`, `rename`, or `addFields` must be present. An empty config object is rejected.

#### Config Example

```json
{
  "extract": ["user.email", "user.name", "event.type"],
  "rename": { "user.email": "email", "event.type": "eventKind" },
  "addFields": { "processedAt": "__now__", "source": "pipeline" }
}
```

---

### textSummarize

Extracts a text field from the payload, produces a sentence-based summary, and returns keyword extraction results.

#### Config Schema

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `inputField` | string | Yes | — | The payload field containing the text to summarize |
| `maxSentences` | integer | No | `3` | Maximum number of sentences in the summary; must be between 1 and 10 |
| `keywordCount` | integer | No | `5` | Number of keywords to extract; must be between 1 and 20 |

#### Config Example

```json
{
  "inputField": "body",
  "maxSentences": 3,
  "keywordCount": 5
}
```

---

## Pipelines

### Create Pipeline

```
POST /pipelines
```

#### Request Body

```json
{
  "name": "string (required)",
  "processorType": "httpEnrich | jsonTransform | textSummarize (required)",
  "config": { ... }
}
```

The shape of `config` must match the schema for the chosen `processorType`. See the Processors section above.

#### Example — httpEnrich

```json
{
  "name": "ip-enrichment-pipeline",
  "processorType": "httpEnrich",
  "config": {
    "lookupField": "ip",
    "enrichUrl": "https://api.ipinfo.io/lite/{value}?token=YOUR_TOKEN"
  }
}
```

#### Example — jsonTransform

```json
{
  "name": "event-normalizer",
  "processorType": "jsonTransform",
  "config": {
    "extract": ["user.email", "event.type"],
    "rename": { "event.type": "eventKind" },
    "addFields": { "processedAt": "__now__" }
  }
}
```

#### Example — textSummarize

```json
{
  "name": "content-summarizer",
  "processorType": "textSummarize",
  "config": {
    "inputField": "body",
    "maxSentences": 2,
    "keywordCount": 3
  }
}
```

#### Response — `201 Created`

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "ip-enrichment-pipeline",
  "processorType": "httpEnrich",
  "config": {
    "lookupField": "ip",
    "enrichUrl": "https://api.ipinfo.io/lite/{value}?token=YOUR_TOKEN",
    "mergeKey": "enrichment",
    "timeoutMs": 5000
  },
  "signingSecret": "whsec_a1b2c3d4e5f6...",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Important:** `signingSecret` is returned **only at creation time** and is never returned again. Store it securely. It cannot be updated or retrieved later.

---

### List Pipelines

```
GET /pipelines
```

Returns all pipelines. `signingSecret` is not included in list responses.

#### Response — `200 OK`

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "ip-enrichment-pipeline",
    "processorType": "httpEnrich",
    "config": { ... },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

---

### Get Pipeline

```
GET /pipelines/:id
```

#### Response — `200 OK`

Same shape as a single item from List Pipelines.

---

### Update Pipeline

```
PATCH /pipelines/:id
```

Only `name` and `config` and `processorType` may be updated.  `signingSecret` cannot be changed after creation. The `config` object is re-validated against the pipeline's processor type on every update of either or both.

#### Request Body

```json
{
  "name": "updated-pipeline-name",
  "config": {
    "lookupField": "email",
    "enrichUrl": "https://api.example.com/lookup/{value}"
  }
}
```

#### Response — `200 OK`

Returns the updated pipeline object.

---

### Delete Pipeline

```
DELETE /pipelines/:id
```

Deletes the pipeline and cascades the deletion to all associated subscriptions and jobs.

#### Response — `204 No Content`

---

## Subscriptions

A subscription registers a callback URL to receive processed results from a pipeline. Each pipeline may have multiple subscribers. The combination of `pipelineId` and `callbackUrl` must be unique.

### Create Subscription

```
POST /pipelines/:id/subscriptions
```

#### Request Body

```json
{
  "callbackUrl": "https://example.com/my-webhook-receiver"
}
```

#### Response — `201 Created`

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "pipelineId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "callbackUrl": "https://example.com/my-webhook-receiver",
  "createdAt": "2024-01-15T10:05:00.000Z"
}
```

---

### List Subscriptions

```
GET /pipelines/:id/subscriptions
```

#### Response — `200 OK`

```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "pipelineId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "callbackUrl": "https://example.com/my-webhook-receiver",
    "createdAt": "2024-01-15T10:05:00.000Z"
  }
]
```

---

### Delete Subscription

```
DELETE /pipelines/:id/subscriptions/:subId
```

#### Response — `204 No Content`

---

## Webhook Ingestion

This is the trigger endpoint. Sending a request here creates a job and queues it for background processing. The response is immediate — processing happens asynchronously.

```
POST /webhooks/:pipelineId
```

### Headers

```
Content-Type: application/json
X-Signature: sha256=<hmac_sha256_hex>
```

### Payload Requirements

All webhook payloads must be valid JSON objects and must include an `eventId` field. Additional required fields depend on the pipeline's processor type.

| Field | Type | Required for | Description |
|---|---|---|---|
| `eventId` | string | All processors | Unique identifier for this event. Used for idempotency within a pipeline. |
| `<lookupField>` | string | `httpEnrich` | The field named in the pipeline's `config.lookupField` (e.g. `"ip"`) must be present |
| `<inputField>` | string | `textSummarize` | The field named in the pipeline's `config.inputField` (e.g. `"body"`) must be present |
| Any fields | any | `jsonTransform` | No additional fields are required; any valid JSON object is accepted |

### Payload Examples

#### httpEnrich (pipeline configured with `lookupField: "ip"`)

```json
{
  "eventId": "evt-2024-001",
  "ip": "8.8.8.8"
}
```

#### jsonTransform

```json
{
  "eventId": "evt-2024-002",
  "user": {
    "email": "jane@example.com",
    "name": "Jane"
  },
  "event": {
    "type": "signup"
  }
}
```

#### textSummarize (pipeline configured with `inputField: "body"`)

```json
{
  "eventId": "evt-2024-003",
  "subject": "Q4 Review",
  "body": "This quarter we exceeded all targets across every region..."
}
```

### Idempotency

The `eventId` field is unique per pipeline. If a request arrives with an `eventId` that has already been processed by the same pipeline, no new job is created and the existing job ID is returned. This is intentional: the same `eventId` always refers to the same logical event, even if the payload differs between submissions. Different events must use different `eventId` values, even if their payloads happen to be identical.

This design is more expressive than payload hashing, which would prevent reprocessing of legitimately identical events from different sources.

### Response — `202 Accepted`

```json
{
  "result": {
    "jobId": "b3fb8a31-6c1a-4e8d-9af7-3f2d5e4c1a77"
  }
}
```

If the `eventId` was a duplicate, `jobId` contains the ID of the original job and no new job is created.

---

## Jobs

Jobs represent individual pipeline executions triggered by an inbound webhook. All job results are stored permanently, regardless of webhook delivery status. This allows subscribers to retrieve results via polling even if all webhook delivery attempts have failed.

### Get All Jobs

```
GET /jobs
```

Optional query parameters:

- `pipelineId` — filter jobs by pipeline ID
- `status` — filter jobs by job status (`queued`, `processing`, `success`, `failed`)

#### Example Requests

```http
GET /jobs
GET /jobs?pipelineId=3fa85f64-5717-4562-b3fc-2c963f66afa6
GET /jobs?status=success
GET /jobs?pipelineId=3fa85f64-5717-4562-b3fc-2c963f66afa6&status=failed
```

#### Response — `200 OK`

Returns an array of job objects.

```json
[
  {
    "id": "b3fb8a31-6c1a-4e8d-9af7-3f2d5e4c1a77",
    "pipelineId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "eventId": "evt-2024-001",
    "payload": {
      "eventId": "evt-2024-001",
      "ip": "8.8.8.8"
    },
    "result": {
      "ip": "8.8.8.8",
      "enrichment": {
        "city": "Mountain View",
        "country": "US",
        "org": "Google LLC"
      }
    },
    "errorMessage": null,
    "status": "success",
    "webhookStatus": "delivered",
    "webhookAttempts": 1,
    "nextWebhookAttemptAt": "2024-01-15T10:05:10.000Z",
    "lockedAt": null,
    "createdAt": "2024-01-15T10:05:00.000Z",
    "startedAt": "2024-01-15T10:05:01.000Z",
    "finishedAt": "2024-01-15T10:05:03.000Z"
  }
]
```

---

### Get Job by ID

```
GET /jobs/:id
```

#### Response — `200 OK`

```json
{
  "id": "b3fb8a31-6c1a-4e8d-9af7-3f2d5e4c1a77",
  "pipelineId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "eventId": "evt-2024-001",
  "payload": {
    "eventId": "evt-2024-001",
    "ip": "8.8.8.8"
  },
  "result": {
    "ip": "8.8.8.8",
    "enrichment": {
      "city": "Mountain View",
      "country": "US",
      "org": "Google LLC"
    }
  },
  "errorMessage": null,
  "status": "success",
  "webhookStatus": "delivered",
  "webhookAttempts": 1,
  "nextWebhookAttemptAt": "2024-01-15T10:05:10.000Z",
  "lockedAt": null,
  "createdAt": "2024-01-15T10:05:00.000Z",
  "startedAt": "2024-01-15T10:05:01.000Z",
  "finishedAt": "2024-01-15T10:05:03.000Z"
}
```

---

### Get Delivery Attempts for a Job

```
GET /jobs/:id/deliveries
```

Returns all webhook delivery attempts recorded for the given job.

#### Response — `200 OK`

```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "jobId": "b3fb8a31-6c1a-4e8d-9af7-3f2d5e4c1a77",
    "subscriptionId": "9d5b8c5d-2f67-4e8f-9a11-7d1c2a9a1234",
    "attemptNumber": 1,
    "statusCode": 500,
    "responseBody": "Internal Server Error",
    "errorMessage": null,
    "attemptedAt": "2024-01-15T10:05:10.000Z"
  },
  {
    "id": "3f1c84d4-12ab-4f91-9d88-1d93b87df321",
    "jobId": "b3fb8a31-6c1a-4e8d-9af7-3f2d5e4c1a77",
    "subscriptionId": "9d5b8c5d-2f67-4e8f-9a11-7d1c2a9a1234",
    "attemptNumber": 2,
    "statusCode": 200,
    "responseBody": "ok",
    "errorMessage": null,
    "attemptedAt": "2024-01-15T10:05:20.000Z"
  }
]
```

---

### Job Status Values

| `status` | Meaning |
|---|---|
| `queued` | Job has been created and is waiting to be picked up by the worker |
| `processing` | Worker has claimed the job and is executing the processor |
| `success` | Processor completed successfully; `result` is populated |
| `failed` | Processor encountered an error; `result` is null |

### Webhook Delivery Status Values

| `webhookStatus` | Meaning |
|---|---|
| `pending` | Result is ready; delivery has not yet been attempted or is scheduled for retry |
| `delivered` | All subscription delivery attempts succeeded and returned a `2xx` response |
| `failed` | All retry attempts were exhausted without a successful delivery |
| `skipped` | The pipeline has no subscriptions; no delivery was attempted |

### Delivery Retry Schedule

The webhook delivery worker retries failed deliveries on the following schedule:

| Attempt | Delay after previous failure |
|---|---|
| 1 | Immediate |
| 2 | 10 seconds |
| 3 | 1 minute |
| 4 | 10 minutes |
| 5 | 1 hour |

After the fifth failed attempt, `webhookStatus` is set to `failed`. Individual delivery attempt records remain accessible via `GET /jobs/:id/deliveries`, and the processed job remains accessible via `GET /jobs/:id`.

---

## Error Responses

All errors return a JSON object with an `error` field.

### Common Errors

#### `400 Bad Request` — Invalid or missing payload field

```json
{ "error": "Payload must include lookup field \"ip\"" }
```

#### `400 Bad Request` — Non-object payload

```json
{ "error": "Payload must be a JSON object" }
```

#### `401 Unauthorized` — Missing or invalid webhook signature

```json
{ "error": "Invalid signature" }
```

#### `404 Not Found` — Resource does not exist

```json
{ "error": "Pipeline not found" }
```

#### `409 Conflict` — Duplicate subscription

```json
{ "error": "Subscription already exists for this pipeline and callbackUrl" }
```

#### `413 Payload Too Large` — Request body exceeds 1 MB

```json
{ "error": "Payload too large" }
```

#### `429 Too Many Requests` — Rate limit exceeded

```json
{ "error": "Too many requests, please try again later" }
```

---

## Testing Notes

When testing with Postman, it is recommended to store the following as environment variables:

- `PIPELINE_ID` — set after creating a pipeline
- `SIGNING_SECRET` — set from the `signingSecret` field returned at pipeline creation; must be updated whenever a new pipeline is used for webhook testing

The pre-request script in the Authentication section above handles signature computation automatically when `SIGNING_SECRET` is set.
