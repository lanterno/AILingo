# Quick Deployment Checklist

## ⚠️ CRITICAL: Fix These Before Deploying

1. **Add Gunicorn to API**
   - Add `gunicorn` to `api/pyproject.toml`
   - Replace `runserver` with `gunicorn` in `api/Dockerfile` CMD

2. **Fix CORS settings**
   - Allow production domain in `api/api/settings.py`

3. **Build images with correct API URL**
   - Web image needs `VITE_API_URL` build arg

## Deployment Steps (Summary)

```bash
# 1. Prerequisites
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable cloudbuild.googleapis.com run.googleapis.com

# 2. Configure Terraform
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values (no db_password needed)

# 3. Build images
cd ../api && gcloud builds submit --tag gcr.io/PROJECT_ID/schole-api:latest .
cd ../web && gcloud builds submit --tag gcr.io/PROJECT_ID/schole-web:latest --build-arg VITE_API_URL=PLACEHOLDER .

# 4. Update terraform.tfvars with image URLs

# 5. Deploy infrastructure
cd terraform
terraform init
terraform plan
terraform apply

# 6. Update web with correct API URL (after API is deployed)
terraform output api_url
# Rebuild web image with correct API URL and redeploy

# 7. Get URLs
terraform output api_url
terraform output web_url
```

See `DEPLOYMENT.md` for detailed instructions.

