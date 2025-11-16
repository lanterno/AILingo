.PHONY: up test format down

up:
	docker compose up

test:
	uv run pytest

format:
	uv run ruff check . --fix
	uv run ruff format
	

down:
	docker compose down

