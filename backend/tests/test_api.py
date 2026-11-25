import os

# Тести працюють з окремою SQLite-базою, а не з PostgreSQL
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_create_and_list(client):
    r = client.post("/api/tasks", json={"title": "Write Dockerfile"})
    assert r.status_code == 201
    assert r.json()["title"] == "Write Dockerfile"
    assert r.json()["done"] is False

    r = client.get("/api/tasks")
    assert len(r.json()) == 1


def test_empty_title_rejected(client):
    r = client.post("/api/tasks", json={"title": ""})
    assert r.status_code == 422


def test_mark_done(client):
    task_id = client.post("/api/tasks", json={"title": "Test"}).json()["id"]
    r = client.patch(f"/api/tasks/{task_id}", json={"done": True})
    assert r.status_code == 200
    assert r.json()["done"] is True


def test_delete(client):
    task_id = client.post("/api/tasks", json={"title": "Delete me"}).json()["id"]
    assert client.delete(f"/api/tasks/{task_id}").status_code == 204
    assert client.get("/api/tasks").json() == []


def test_not_found(client):
    assert client.patch("/api/tasks/999", json={"done": True}).status_code == 404
    assert client.delete("/api/tasks/999").status_code == 404
