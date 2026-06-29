# webhook-task-pipeline-dl

`webhook-task-pipeline-dl` is a DevOps learning-path project based on an existing backend-focused webhook task pipeline.

The original project ran with Docker Compose and included an API service, a worker service, PostgreSQL, and Drizzle migrations. This repo evolves that system into a practical DevOps/SRE lab using Kubernetes, Helm, Argo CD, GitHub Actions, Docker Hub, Prometheus, and Grafana.

The goal is not to make a production-perfect platform. The goal is to learn how modern delivery and operations workflows fit together around a real backend system.

## Goals

- Preserve the original Docker Compose developer workflow.
- Containerize the API and worker using a production-style Docker image.
- Publish immutable Docker images to Docker Hub through GitHub Actions.
- Deploy the system locally on Minikube.
- Package Kubernetes resources with Helm.
- Manage deployments through Argo CD and GitOps.
- Run PostgreSQL on Kubernetes to learn StatefulSet behavior.
- Run database migrations as Kubernetes Jobs.
- Add application metrics for the API and worker.
- Deploy Prometheus and Grafana for observability.
- Practice release, rollback, drift detection, and operational debugging.

## Target Architecture

```text
GitHub Repo
  |
  | GitHub Actions
  | - lint
  | - typecheck
  | - test
  | - build image
  | - push image to Docker Hub
  | - update Helm values
  v

Docker Hub
  |
  | imagePull
  v

Minikube Cluster
  |
  | managed by
  v

Argo CD
  |
  | syncs desired state from Git
  v

Kubernetes
  |
  |-- API Deployment
  |-- Worker Deployment
  |-- PostgreSQL StatefulSet
  |-- Migration Job
  |-- Services
  |-- ConfigMaps
  |-- Secrets
  |-- Prometheus
  |-- Grafana
```

## Running Locally with Docker Compose

This project includes a Docker Compose setup to run the full system locally, including:

- PostgreSQL database  
- Migration job (Drizzle)  
- API service  
- Worker service  

### Prerequisites

- Docker
- Docker Compose

---

### Start the services

From the project root:

```bash
docker compose up --build
```
This will:
1. Build the application image (using a multi-stage Dockerfile)
2. Start PostgreSQL
3. Wait until the database is healthy
4. Run database migrations (one-time job)
5. Start the API and worker services

### Verify everything is running
Check running containers
```bash
docker ps
```
You should see:
- `pipeline_postgres` (healthy)
- `pipeline_api` (running on port 3000)
- `pipeline_worker` (running)

### Test the API
Once the API is up, you can initially test it:
```bash
curl http://localhost:3000/api/v1/pipelines
curl http://localhost:3000/api/v1/job
```
Expected response (fresh database):
```text
[]
```

### View logs
To stream logs from all services:
```bash
docker compose logs -f
```

### Stop the services
```bash
docker compose stop
```

### Reset to clean state
To remove all data and start fresh:
```bash
docker compose down -v # deletes volume so database is wiped
docker compose up --build
```
---
### Notes
- The database is initialized automatically using environment variables
- Migrations are executed by a dedicated `migrate` service to avoid race conditions
- Service startup is coordinated using health checks to ensure PostgreSQL is ready before the application connects