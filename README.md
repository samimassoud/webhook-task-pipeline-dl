# Webhook Task Pipeline DevOps/SRE Learning Plan

## Project Goal

Transform the existing `webhook-task-pipeline` backend project from a Docker Compose app into a Kubernetes-native system deployed locally on Minikube using Helm, managed by Argo CD, monitored with Prometheus and Grafana, and built/published through GitHub Actions.

The goal is not just to "make it run on Kubernetes," but to practice real DevOps/SRE workflows:

- container image builds
- Helm chart design
- Kubernetes deployments
- StatefulSet PostgreSQL
- GitOps with Argo CD
- observability with Prometheus and Grafana
- CI/CD pipeline design
- operational debugging
- release and rollback workflows
