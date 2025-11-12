terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Cloud Run service for API
resource "google_cloud_run_service" "api" {
  name     = "schole-api"
  location = var.region

  template {
    spec {
      containers {
        image = var.api_image

        env {
          name  = "SECRET_KEY"
          value = var.secret_key
        }

        env {
          name  = "DEBUG"
          value = "0"
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

# Cloud Run service for Web
resource "google_cloud_run_service" "web" {
  name     = "schole-web"
  location = var.region

  template {
    spec {
      containers {
        image = var.web_image

        env {
          name  = "VITE_API_URL"
          value = google_cloud_run_service.api.status[0].url
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

# IAM policy to allow unauthenticated access
resource "google_cloud_run_service_iam_member" "api_public" {
  service  = google_cloud_run_service.api.name
  location = google_cloud_run_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "web_public" {
  service  = google_cloud_run_service.web.name
  location = google_cloud_run_service.web.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Outputs
output "api_url" {
  value = google_cloud_run_service.api.status[0].url
}

output "web_url" {
  value = google_cloud_run_service.web.status[0].url
}

