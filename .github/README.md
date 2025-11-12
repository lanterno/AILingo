# CI/CD Documentation

This repository includes GitHub Actions workflows for continuous integration and deployment.

## Workflows

### API CI/CD (`.github/workflows/api.yml`)

Runs on pushes and pull requests to `main` and `develop` branches when API files change.

**Jobs:**
- **test**: Runs Django tests against PostgreSQL database
- **lint**: Runs ruff for code quality checks
- **build-docker**: Builds Docker image (only on push to main)

**Requirements:**
- PostgreSQL service (provided by GitHub Actions)
- Python 3.11
- uv package manager

### Web CI/CD (`.github/workflows/web.yml`)

Runs on pushes and pull requests to `main` and `develop` branches when web files change.

**Jobs:**
- **lint**: Type checks TypeScript code
- **build**: Builds the React application
- **build-docker**: Builds Docker image (only on push to main)

**Requirements:**
- Bun runtime
- Node.js 20 (for Docker build)

### Full Stack Deploy (`.github/workflows/deploy.yml`)

Orchestrates deployment of both API and Web services using Terraform.

**Jobs:**
- Runs API and Web workflows
- Deploys to GCP using Terraform (manual trigger)

## Setup

### Required GitHub Secrets

For Docker Hub (optional):
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password or access token

For Web build:
- `VITE_API_URL`: API URL for production builds (optional, defaults to localhost)

For API:
- `OPENAI_API_KEY`: OpenAI API key (required for question generation and evaluation)

For Terraform deployment:
- `GCP_PROJECT_ID`: Google Cloud Project ID
- `GCP_SA_KEY`: Google Cloud Service Account JSON key (for authentication)
- `DB_PASSWORD`: Database password (if using database)
- `DJANGO_SECRET_KEY`: Django secret key
- `API_IMAGE`: Full Docker image URL for API (e.g., `gcr.io/project/schole-api:latest`)
- `WEB_IMAGE`: Full Docker image URL for Web (e.g., `gcr.io/project/schole-web:latest`)
- `DEPLOYMENT_URL`: Production deployment URL (for status badge)

### Adding Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the appropriate name and value

## Workflow Triggers

### Automatic Triggers

- **Push to main/develop**: Runs tests, linting, and builds Docker images
- **Pull Request**: Runs tests and linting only

### Manual Triggers

- **Deploy workflow**: Can be manually triggered from Actions tab
- **Terraform Apply**: Only runs on manual workflow dispatch for safety

## Local Testing

You can test the workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run API workflow
act -W .github/workflows/api.yml

# Run Web workflow
act -W .github/workflows/web.yml
```

## Docker Images

The workflows build Docker images with the following tags:
- `schole-api:${{ github.sha }}` - Commit-specific tag
- `schole-api:latest` - Latest tag

If Docker Hub credentials are provided, images are automatically pushed.

## Notes

- Tests run against PostgreSQL in GitHub Actions
- Local development uses SQLite (via `USE_SQLITE=true`)
- Docker images are only built on pushes to main branch
- Terraform deployment requires manual approval for safety

