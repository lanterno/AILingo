variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "secret_key" {
  description = "Django secret key"
  type        = string
  sensitive   = true
}

variable "api_image" {
  description = "Container image for API service"
  type        = string
  default     = "gcr.io/PROJECT_ID/schole-api:latest"
}

variable "web_image" {
  description = "Container image for Web service"
  type        = string
  default     = "gcr.io/PROJECT_ID/schole-web:latest"
}

