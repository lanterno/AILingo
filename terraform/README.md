# Terraform configuration for Scholé Bubble Chart deployment on GCP

## Prerequisites

1. Install Terraform: https://www.terraform.io/downloads
2. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
3. Authenticate with GCP: `gcloud auth login` and `gcloud auth application-default login`
4. Enable required APIs:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   ```

## Setup

1. Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in your values:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Build and push Docker images:
   ```bash
   # Build API image
   cd ../api
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/schole-api:latest
   
   # Build Web image
   cd ../web
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/schole-web:latest
   ```

3. Update `terraform.tfvars` with your image URLs

4. Initialize Terraform:
   ```bash
   terraform init
   ```

5. Plan deployment:
   ```bash
   terraform plan
   ```

6. Apply configuration:
   ```bash
   terraform apply
   ```

## Architecture

- **Cloud Run**: Serverless containers for API and Web services
- **IAM**: Public access configured for both services
- **API**: Stateless Django REST API (no database required)

## Outputs

After deployment, Terraform will output:
- `api_url`: URL of the API service
- `web_url`: URL of the Web service

## Notes

- Both services are publicly accessible. Add authentication as needed.
- Secret key is stored as Terraform variable. Use secrets management for production.
- The API is stateless and doesn't require a database.

