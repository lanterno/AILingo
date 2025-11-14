terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "cloudrun" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry" {
  project            = var.project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

# Create Artifact Registry repository for Docker images
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "ailingo-api"
  description   = "Docker repository for ailingo-api"
  format        = "DOCKER"
  depends_on    = [google_project_service.artifactregistry]
}

# Wait for APIs to propagate
resource "time_sleep" "wait_for_apis" {
  depends_on = [google_project_service.cloudrun, google_project_service.artifactregistry]
  create_duration = "60s"
}

# Wait for Cloud Run API to propagate
resource "time_sleep" "wait_for_cloudrun_api" {
  depends_on = [time_sleep.wait_for_apis]
  create_duration = "60s"
}

# Cloud Run service for API
resource "google_cloud_run_service" "api" {
  name     = "ailingo-api"
  location = var.region

  depends_on = [time_sleep.wait_for_cloudrun_api, google_artifact_registry_repository.docker_repo]

  template {
    spec {
      containers {
        image = var.api_image != "" ? var.api_image : "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/ailingo-api:latest"

        env {
          name  = "SECRET_KEY"
          value = var.secret_key
        }

        env {
          name  = "DEBUG"
          value = "0"
        }

        env {
          name  = "OPENAI_API_KEY"
          value = var.openai_api_key
        }

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Enable Firebase Hosting API
resource "google_project_service" "firebasehosting" {
  provider           = google-beta
  project            = var.project_id
  service            = "firebasehosting.googleapis.com"
  disable_on_destroy = false
}

# Firebase Hosting site
resource "google_firebase_hosting_site" "web" {
  provider  = google-beta
  project   = var.project_id
  site_id   = "${var.project_id}-ailingo-web"
  depends_on = [google_project_service.firebasehosting]
}

# IAM policy to allow unauthenticated access
resource "google_cloud_run_service_iam_member" "api_public" {
  service  = google_cloud_run_service.api.name
  location = google_cloud_run_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
  depends_on = [google_cloud_run_service.api]
}


# Outputs
output "api_url" {
  value = google_cloud_run_service.api.status[0].url
}

output "web_url" {
  value = "https://${google_firebase_hosting_site.web.site_id}.web.app"
}

output "web_site_id" {
  value = google_firebase_hosting_site.web.site_id
}

