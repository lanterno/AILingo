# Production Deployment Guide

## Terraform Configuration Review

### ✅ What's Good
- Clean infrastructure-as-code setup with Terraform
- Uses Cloud Run for serverless container deployment
- Proper resource limits set for Cloud Run services
- Stateless API design (no database required)

### ⚠️ Issues to Address Before Deployment

#### 1. **Development Server in Production**
   - **Issue**: Dockerfile uses `python manage.py runserver` (dev server)
   - **Impact**: Not suitable for production (single-threaded, no process management)
   - **Fix Required**: Use Gunicorn or uWSGI

#### 2. **CORS Configuration**
   - **Issue**: CORS_ALLOWED_ORIGINS only includes localhost
   - **Impact**: Frontend won't be able to call API from production domain
   - **Fix Required**: Add production domain or use environment variable

#### 3. **Secrets Management**
   - **Issue**: Secrets stored in Terraform variables (visible in state)
   - **Impact**: Security risk if state file is exposed
   - **Recommendation**: Use GCP Secret Manager

#### 4. **Web Build Configuration**
   - **Issue**: Web Dockerfile needs `VITE_API_URL` build arg set correctly
   - **Impact**: Frontend may not connect to API correctly
   - **Fix Required**: Ensure build arg is set during image build

---

## Pre-Deployment Fixes

### Fix 1: Update API Dependencies

**File**: `api/pyproject.toml`

Add Gunicorn for production server:
```toml
dependencies = [
    "django>=5.0",
    "djangorestframework>=3.14",
    "django-cors-headers>=4.3",
    "drf-spectacular>=0.27",
    "openai>=1.0",
    "gunicorn>=21.2",        # Add this for production server
]
```

### Fix 2: Update CORS Settings

**File**: `api/api/settings.py`

Replace CORS configuration (around line 98) with:

```python
# CORS configuration
if os.environ.get("DEBUG", "0") == "0":
    # Production: Allow all origins (or specify your domain)
    CORS_ALLOW_ALL_ORIGINS = True
    # Or be more specific:
    # CORS_ALLOWED_ORIGINS = [
    #     "https://your-production-domain.com",
    # ]
else:
    # Development: Only allow localhost
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
```

### Fix 3: Update API Dockerfile for Production

**File**: `api/Dockerfile`

Replace the CMD line with:

```dockerfile
# Use gunicorn instead of runserver
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "api.wsgi:application"]
```

Or if gunicorn is in dependencies:
```dockerfile
CMD ["python", "-m", "gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "api.wsgi:application"]
```

---

## Step-by-Step Deployment Process

### Prerequisites

1. **Install Required Tools**
   ```bash
   # Install Terraform
   curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
   sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
   sudo apt-get update && sudo apt-get install terraform

   # Install Google Cloud SDK (if not already installed)
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   ```

2. **Set Up GCP Project**
   ```bash
   # Authenticate
   gcloud auth login
   gcloud auth application-default login

   # Set your project
   gcloud config set project YOUR_PROJECT_ID

   # Enable required APIs
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   ```

### Step 1: Apply Pre-Deployment Fixes

Apply all the fixes mentioned above before proceeding.

### Step 2: Configure Terraform Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
project_id  = "your-gcp-project-id"
region      = "us-central1"
secret_key  = "your-django-secret-key-here"  # Generate with: openssl rand -base64 64

# Images will be set after building
# api_image = "gcr.io/your-project-id/schole-api:latest"
# web_image = "gcr.io/your-project-id/schole-web:latest"
```

**Important**: Generate a secure secret key:
```bash
openssl rand -base64 64  # For secret_key
```

### Step 3: Build and Push Docker Images

#### Build API Image
```bash
cd ../api

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/schole-api:latest .

# Or build locally and push
docker build -t gcr.io/YOUR_PROJECT_ID/schole-api:latest .
docker push gcr.io/YOUR_PROJECT_ID/schole-api:latest
```

#### Build Web Image
```bash
cd ../web

# Option 1: Build with placeholder API URL (update after API deployment)
gcloud builds submit \
  --tag gcr.io/YOUR_PROJECT_ID/schole-web:latest \
  --build-arg VITE_API_URL=https://schole-api-XXXXX.run.app \
  .

# Option 2: Build locally
docker build \
  --build-arg VITE_API_URL=https://schole-api-XXXXX.run.app \
  -t gcr.io/YOUR_PROJECT_ID/schole-web:latest .
docker push gcr.io/YOUR_PROJECT_ID/schole-web:latest
```

**Note**: For the web image, you have two options:
1. Build with placeholder API URL, deploy API first, then rebuild web with correct URL
2. Use environment variable injection at runtime (requires code changes)

### Step 4: Update Terraform Variables with Image URLs

Edit `terraform/terraform.tfvars`:
```hcl
api_image = "gcr.io/YOUR_PROJECT_ID/schole-api:latest"
web_image = "gcr.io/YOUR_PROJECT_ID/schole-web:latest"
```

### Step 5: Initialize and Plan Terraform

```bash
cd terraform

# Initialize Terraform
terraform init

# Review the plan
terraform plan
```

Review the plan carefully. It should show:
- Cloud Run services for API and web
- IAM policies for public access

### Step 6: Apply Terraform Configuration

```bash
# Apply the configuration
terraform apply

# Type 'yes' when prompted
```

This will take 2-5 minutes as it creates:
- Cloud Run services

### Step 7: Update Web Service with Correct API URL

After API is deployed, get its URL:
```bash
terraform output api_url
```

Rebuild and redeploy web service:
```bash
cd web
gcloud builds submit \
  --tag gcr.io/YOUR_PROJECT_ID/schole-web:latest \
  --build-arg VITE_API_URL=$(terraform -chdir=../terraform output -raw api_url) \
  .

# Update Cloud Run service
gcloud run deploy schole-web \
  --image gcr.io/YOUR_PROJECT_ID/schole-web:latest \
  --region us-central1 \
  --platform managed
```

### Step 8: Verify Deployment

```bash
# Get service URLs
terraform output api_url
terraform output web_url

# Test API
curl $(terraform output -raw api_url)/api/docs/

# Test Web
curl $(terraform output -raw web_url)
```

---

## Post-Deployment Checklist

- [ ] API is accessible and responding
- [ ] Web frontend loads correctly
- [ ] Environment variables are set correctly
- [ ] Health checks are passing
- [ ] SSL certificates are valid (Cloud Run provides these automatically)
- [ ] CORS is configured correctly (frontend can call API)

---

## Troubleshooting

### Frontend Can't Call API
- Check CORS configuration in API settings
- Verify API URL is correct in frontend build
- Check browser console for CORS errors

### Cloud Run Service Won't Start
- Check container logs: `gcloud run services logs read schole-api --region us-central1`
- Verify environment variables are set correctly
- Check that Docker image exists and is accessible
- Ensure Gunicorn is installed and CMD is correct

### API Returns 500 Errors
- Check logs: `gcloud run services logs read schole-api --region us-central1`
- Verify SECRET_KEY is set
- Check that all dependencies are installed in Docker image

---

## Cost Optimization

- **Cloud Run**: Pay only for requests (free tier: 2 million requests/month)
- **Container Registry**: Consider using Artifact Registry instead (newer, better)
- No database costs since the API is stateless

---

## Security Recommendations

1. **Use Secret Manager** for sensitive values instead of Terraform variables
2. **Add authentication** to Cloud Run services if needed
3. **Use least privilege IAM** roles
4. **Restrict CORS** to specific domains instead of allowing all origins
5. **Enable audit logging** for Cloud Run
6. **Update dependencies** regularly for security patches
7. **Use HTTPS only** (Cloud Run provides this automatically)

---

## Next Steps

1. Set up CI/CD pipeline (GitHub Actions, Cloud Build, etc.)
2. Configure custom domains
3. Set up monitoring and alerting
4. Implement proper logging
5. Add authentication/authorization if needed
6. Set up staging environment
7. Configure rate limiting if needed
