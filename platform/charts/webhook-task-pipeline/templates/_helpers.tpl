{{/*
Chart name
*/}}
{{- define "webhook-task-pipeline.name" -}}
{{- default .Chart.Name .Values.nameOverride -}}
{{- end -}}

{{/*
Full chart name — used for resource metadata.name so releases don't collide
*/}}
{{- define "webhook-task-pipeline.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
app secret name helper
*/}}
{{- define "webhook-task-pipeline.appSecretName" -}}
{{- if .Values.sealedAppSecret.name -}}
{{- .Values.sealedAppSecret.name | trunc 63 | trimSuffix "-"}}
{{- else -}}
{{- printf "%s-app-secret" .Release.Name -}}
{{- end -}}
{{- end -}}

{{/*
admin secret name helper
*/}}
{{- define "webhook-task-pipeline.adminSecretName" -}}
{{- if .Values.sealedAdminSecret.name -}}
{{- .Values.sealedAdminSecret.name | trunc 63 | trimSuffix "-"}}
{{- else -}}
{{- printf "%s-admin-secret" .Release.Name -}}
{{- end -}}
{{- end -}}

{{/*
Selector labels — must stay stable for the lifetime of a Deployment,
never add anything here that can change across upgrades
*/}}
{{- define "webhook-task-pipeline.selectorLabels" -}}
app.kubernetes.io/name: {{ include "webhook-task-pipeline.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Common labels for all resources
*/}}
{{- define "webhook-task-pipeline.labels" -}}
{{ include "webhook-task-pipeline.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end -}}

{{/*
Image helper
*/}}
{{- define "webhook-task-pipeline.image" -}}
{{ .Values.image.repository }}:{{ .Values.image.tag }}
{{- end -}}