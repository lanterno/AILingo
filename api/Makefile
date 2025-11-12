.PHONY: up test format down

up:
	docker compose up

test:
	pytest

format:
	ruff check . --fix
	ruff format
	

down:
	docker compose down

