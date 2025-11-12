# Scholé Bubble Chart

Full-stack application for interactive bubble charts with drag-and-drop functionality.

## Project Structure

- `api/` - Django REST API backend
- `web/` - React frontend with Chart.js
- `terraform/` - GCP deployment configuration

## Quick Start

### API (Django)

```bash
cd api

# Using Docker Compose
docker-compose up

# Or using uv locally (with SQLite)
USE_SQLITE=true uv run python manage.py migrate
USE_SQLITE=true uv run python seed_data.py
USE_SQLITE=true uv run python manage.py runserver
```

API will be available at `http://localhost:8000`
- API Docs: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`

### Web (React)

```bash
cd web
bun install
bun run dev
```

Web app will be available at `http://localhost:3000`

## Features

- ✅ Interactive bubble chart with Chart.js
- ✅ Drag-and-drop bubbles
- ✅ Auto-save on drag end
- ✅ RESTful API with Django REST Framework
- ✅ API documentation (Swagger/ReDoc)
- ✅ Docker support
- ✅ Terraform for GCP deployment

## Testing

### API Tests

```bash
cd api
USE_SQLITE=true uv run python manage.py test
```

## Deployment

See `terraform/README.md` for GCP deployment instructions.

