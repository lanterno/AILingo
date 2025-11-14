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
  description = "Container image for API service in Google Artifact Registry. Format: REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/IMAGE:TAG"
  type        = string
  default     = ""
}

variable "openai_api_key" {
  description = "OpenAI API key for the API service"
  type        = string
  sensitive   = true
}

