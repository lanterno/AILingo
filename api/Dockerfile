FROM python:3.11-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml ./

# Install dependencies
RUN uv pip install --system -e .

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Note: OPENAI_API_KEY must be provided as an environment variable at runtime
# Example: docker run -e OPENAI_API_KEY=your-key schole-api

# Start server
CMD python manage.py runserver 0.0.0.0:8000
