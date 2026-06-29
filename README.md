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