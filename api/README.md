# Scholé Bubble Chart API

Django REST API for AI-powered educational bubble chart questions.

## Setup

### Using uv locally

```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv pip install -e .

# Set OpenAI API key (required)
export OPENAI_API_KEY="your-api-key-here"

# Run the server
python manage.py runserver
```

The API will be available at `http://localhost:8000`

### Using .env file

Create a `.env` file in the `api/` directory:

```bash
OPENAI_API_KEY=your-api-key-here
```

Then load it before running:

```bash
export $(cat .env | xargs) && python manage.py runserver
```

## API Endpoints

- `POST /api/charts/generate-question/` - Generate a new educational question using AI
- `POST /api/charts/evaluate/` - Evaluate student's solution and provide feedback

## API Documentation

- Swagger UI: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`

## Environment Variables

- `OPENAI_API_KEY`: OpenAI API key (required) - Get your key from https://platform.openai.com/api-keys

## Features

- AI-powered question generation using OpenAI GPT
- Intelligent solution evaluation with personalized feedback
- No database required - stateless API

## Docker

When running with Docker, pass the API key as an environment variable:

```bash
docker build -t schole-api .
docker run -p 8000:8000 -e OPENAI_API_KEY=your-key-here schole-api
```
