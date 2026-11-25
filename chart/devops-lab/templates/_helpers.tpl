{{/* Ім'я чарта (можна перевизначити через nameOverride) */}}
{{- define "devops-lab.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Повне ім'я об'єктів: <реліз>-<чарт>. Якщо ім'я релізу вже містить ім'я чарта — лише ім'я релізу.
Завдяки цьому чарт можна встановити двічі в один кластер під різними іменами релізів.
*/}}
{{- define "devops-lab.fullname" -}}
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

{{/* Ім'я компонента: <повне ім'я>-<компонент>. Виклик: include "devops-lab.componentName" (list . "backend") */}}
{{- define "devops-lab.componentName" -}}
{{- $root := index . 0 }}
{{- printf "%s-%s" (include "devops-lab.fullname" $root) (index . 1) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Спільний набір міток для всіх об'єктів релізу */}}
{{- define "devops-lab.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
app.kubernetes.io/name: {{ include "devops-lab.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: devops-lab
{{- end }}

{{/* Мітки-селектори компонента (незмінні між оновленнями). Виклик: include "devops-lab.selectorLabels" (list . "backend") */}}
{{- define "devops-lab.selectorLabels" -}}
{{- $root := index . 0 }}
app.kubernetes.io/name: {{ include "devops-lab.name" $root }}
app.kubernetes.io/instance: {{ $root.Release.Name }}
app.kubernetes.io/component: {{ index . 1 }}
{{- end }}

{{/* Мітки компонента = спільні мітки + компонент. Виклик: include "devops-lab.componentLabels" (list . "backend") */}}
{{- define "devops-lab.componentLabels" -}}
{{ include "devops-lab.labels" (index . 0) }}
app.kubernetes.io/component: {{ index . 1 }}
{{- end }}

{{/* Образ repository:tag; якщо тег не задано — appVersion чарта */}}
{{- define "devops-lab.image" -}}
{{- $root := index . 0 }}
{{- $img := index . 1 }}
{{- printf "%s:%s" $img.repository (default $root.Chart.AppVersion $img.tag | toString) }}
{{- end }}

{{/* Пароль бази — обов'язковий, без нього встановлення зупиняється */}}
{{- define "devops-lab.dbPassword" -}}
{{- required "Потрібно задати пароль бази: --set database.password=..." .Values.database.password }}
{{- end }}
