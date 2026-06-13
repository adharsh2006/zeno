from fastapi.testclient import TestClient
import pytest
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_get_customers_empty():
    response = client.get("/api/v1/customers/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
