# Webhook-Driven Task Processing Pipeline
![CI](https://github.com/samimassoud/webhook-task-pipeline/actions/workflows/ci.yml/badge.svg)

An event-driven backend service that receives webhooks, processes them asynchronously through a background job system, and delivers results to registered subscribers. Conceptually similar to Zapier — an inbound event triggers a processing step, and the result is forwarded to one or more destinations.

---

## How It Works

1. A client sends a webhook to a pipeline's ingest URL
2. The system queues a job and responds immediately with `202 Accepted`
3. A background worker picks up the job and runs the configured processor
4. The result is stored and delivered to all registered subscriber URLs
5. If delivery fails, the system retries on an exponential backoff schedule
6. Regardless of delivery outcome, the result is always retrievable via the jobs API

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| HTTP Framework | Express |
| Database | PostgreSQL |
| ORM | Drizzle |
| Containerization | Docker & Docker Compose |
| CI/CD | GitHub Actions |

---

## Project Structure

```
src/
  api/          HTTP layer — routes, validation, request handling
  worker/       Background job processor and webhook delivery worker
  processors/   Pluggable processing action implementations
  services/     Business logic and orchestration
  repositories/ All database access
  types/        Shared TypeScript interfaces
```

The API server and worker run as two separate processes, sharing the same database. In development they are started independently; in production they run as separate containers under Docker Compose.

---

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Clone

```bash
git clone https://github.com/samimassoud/webhook-task-pipeline.git
cd webhook-task-pipeline
```

### Run

```bash
docker compose up
```

This starts PostgreSQL, runs database migrations, and launches both the API server and the background worker. The API is available at `http://localhost:3000`.

### Development

To run the two processes locally without Docker:

```bash
# Terminal 1 — API server
npm run dev:api

# Terminal 2 — Background worker
npm run dev:worker
```

Requires a running PostgreSQL instance. Configure the connection via `DATABASE_URL` in a `.env` file.

---

## Processors

Each pipeline is configured with one of three processor types:

| Processor | Description |
|---|---|
| `httpEnrich` | Looks up a payload field against an external HTTP API and merges the response |
| `jsonTransform` | Restructures a JSON payload by extracting, renaming, and adding fields |
| `textSummarize` | Extracts a text field and returns a sentence summary with keyword extraction |

---

## Documentation

- **API reference** — endpoint specs, processor config schemas, payload requirements, error responses, and rate limits: [`src/api/README.md`](src/api/README.md)
- **Worker internals** — job lifecycle, webhook delivery, retry logic, and crash recovery: [`src/worker/README.md`](src/worker/README.md)

---

## CI/CD

GitHub Actions runs on pull requests targeting `main` as a confidence pipeline.
It currently verifies:

- Type checking with `tsc --noEmit`
- Linting
- Unit tests with Vitest
- Docker image build verification

This workflow does not deploy or publish images. It is used to catch issues early before merging.
