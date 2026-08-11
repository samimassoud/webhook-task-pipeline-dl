{{/*
Expand the name of the chart.
*/}}
{{- define "platform-gateway.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "platform-gateway.fullname" -}}
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
Chart name and version.
*/}}
{{- define "platform-gateway.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "platform-gateway.labels" -}}
helm.sh/chart: {{ include "platform-gateway.chart" . }}
{{ include "platform-gateway.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels.
*/}}
{{- define "platform-gateway.selectorLabels" -}}
app.kubernetes.io/name: {{ include "platform-gateway.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
GatewayClass name.
*/}}
{{- define "platform-gateway.gatewayClassName" -}}
{{- required "gatewayClass.name must be set" .Values.gatewayClass.name -}}
{{- end }}

{{/*
Gateway name.
*/}}
{{- define "platform-gateway.gatewayName" -}}
{{- required "gateway.name must be set" .Values.gateway.name -}}
{{- end }}

{{/*
Gateway namespace.
*/}}
{{- define "platform-gateway.gatewayNamespace" -}}
{{- default .Release.Namespace .Values.gateway.namespace -}}
{{- end }}