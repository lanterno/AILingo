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
  description = "Container image for API service (supports gcr.io, ghcr.io, docker.io, or any container registry). For GitHub Packages, use format: ghcr.io/OWNER/REPO:TAG"
  type        = string
  default     = "ghcr.io/USERNAME/ailingo-api:latest"
}

