FROM python:3.14-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml ./

RUN uv pip install --system -e .

COPY . .

EXPOSE 8000

# Note: OPENAI_API_KEY must be provided as an environment variable at runtime
# Example: docker run -e OPENAI_API_KEY=your-key ailingo-api

CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
