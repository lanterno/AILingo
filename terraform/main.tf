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

  labels = {
    managed = "terraform"
    purpose = "api-images"
  }
}

# Wait for APIs to propagate
resource "time_sleep" "wait_for_apis" {
  depends_on = [
    google_project_service.cloudrun,
    google_project_service.artifactregistry
  ]
  create_duration = "60s"
}

# Wait for Cloud Run API to propagate
resource "time_sleep" "wait_for_cloudrun_api" {
  depends_on      = [time_sleep.wait_for_apis]
  create_duration = "60s"
}

# Cloud Run service for API
resource "google_cloud_run_service" "api" {
  name     = "ailingo-api"
  location = var.region

  depends_on = [time_sleep.wait_for_cloudrun_api, google_artifact_registry_repository.docker_repo]

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "0"
        "autoscaling.knative.dev/maxScale" = "10"
      }
      labels = {
        service = "ailingo-api"
        managed = "terraform"
      }
    }

    spec {
      container_concurrency = 80
      timeout_seconds       = 300

      containers {
        image = var.api_image != "" ? var.api_image : "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/ailingo-api:latest"

        ports {
          container_port = 8080
        }

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
          requests = {
            cpu    = "100m"
            memory = "128Mi"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image
    ]
  }
}

# Enable Firebase Hosting API
resource "google_project_service" "firebasehosting" {
  provider           = google-beta
  project            = var.project_id
  service            = "firebasehosting.googleapis.com"
  disable_on_destroy = false
}

# Firebase Hosting site (using default site - project ID)
# The default site is automatically created by Firebase, we just manage it with Terraform
resource "google_firebase_hosting_site" "web" {
  provider   = google-beta
  project    = var.project_id
  site_id    = var.project_id
  depends_on = [google_project_service.firebasehosting]
}

# Grant Firebase Hosting Admin role to GitHub Actions service account
resource "google_project_iam_member" "github_actions_firebase_hosting" {
  project = var.project_id
  role    = "roles/firebasehosting.admin"
  member  = "serviceAccount:github-actions@${var.project_id}.iam.gserviceaccount.com"
  depends_on = [google_firebase_hosting_site.web]
}

# IAM policy to allow unauthenticated access
resource "google_cloud_run_service_iam_member" "api_public" {
  service    = google_cloud_run_service.api.name
  location   = google_cloud_run_service.api.location
  role       = "roles/run.invoker"
  member     = "allUsers"
  depends_on = [google_cloud_run_service.api]
}

# Enable Cloud Resource Manager API for domain verification
resource "google_project_service" "cloudresourcemanager" {
  project            = var.project_id
  service            = "cloudresourcemanager.googleapis.com"
  disable_on_destroy = false
}

# Wait for Cloud Run service to be ready before creating domain mapping
resource "time_sleep" "wait_for_service_ready" {
  depends_on = [google_cloud_run_service.api]
  create_duration = "30s"
  
  # This gives the service time to become ready
  # Note: If the service is failing to start, this won't help - fix the container issue first
}

# Cloud Run domain mapping for API
resource "google_cloud_run_domain_mapping" "api_domain" {
  location = var.region
  name     = "api.ailingo.elghareeb.space"

  metadata {
    namespace = var.project_id
    labels = {
      managed = "terraform"
    }
  }

  spec {
    route_name = google_cloud_run_service.api.name
  }

  depends_on = [
    google_cloud_run_service.api,
    google_project_service.cloudresourcemanager,
    time_sleep.wait_for_service_ready
  ]

}

# Firebase Hosting custom domain
resource "google_firebase_hosting_custom_domain" "web_domain" {
  provider      = google-beta
  project       = var.project_id
  site_id       = google_firebase_hosting_site.web.site_id
  custom_domain = "ailingo.elghareeb.space"

  depends_on = [google_firebase_hosting_site.web]
}

# Outputs
output "api_url" {
  description = "Default Cloud Run URL for the API"
  value       = try(google_cloud_run_service.api.status[0].url, "Not deployed yet")
}

output "api_custom_domain" {
  description = "Custom domain URL for the API"
  value       = try("https://${google_cloud_run_domain_mapping.api_domain.name}", "Not configured yet")
}

output "api_domain_verification_records" {
  description = "DNS records needed to verify the API custom domain"
  value       = try(google_cloud_run_domain_mapping.api_domain.status[0].resource_records, [])
}

output "web_url" {
  description = "Default Firebase Hosting URL for the web app"
  value       = try("https://${google_firebase_hosting_site.web.site_id}.web.app", "Not deployed yet")
}

output "web_custom_domain" {
  description = "Custom domain URL for the web app"
  value       = try("https://${google_firebase_hosting_custom_domain.web_domain.custom_domain}", "Not configured yet")
}

output "web_domain_verification_records" {
  description = "DNS records needed to verify the web custom domain"
  value       = try(google_firebase_hosting_custom_domain.web_domain.required_dns_updates, [])
}

output "web_site_id" {
  description = "Firebase Hosting site ID"
  value       = try(google_firebase_hosting_site.web.site_id, "Not created yet")
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository name"
  value       = google_artifact_registry_repository.docker_repo.name
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

