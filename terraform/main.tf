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

# Cloud Run service for API
resource "google_cloud_run_service" "api" {
  name     = "ailingo-api"
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

