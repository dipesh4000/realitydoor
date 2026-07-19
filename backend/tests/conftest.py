import os

os.environ["APP_ENV"] = "test"
os.environ["USE_IN_MEMORY_REPOSITORY"] = "true"

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_document_repository, get_packet_repository, get_session_repository
from app.core.config import get_settings
from app.main import create_app


@pytest.fixture
def client():
    get_settings.cache_clear()
    get_session_repository.cache_clear()
    get_document_repository.cache_clear()
    get_packet_repository.cache_clear()
    with TestClient(create_app()) as test_client:
        yield test_client
    get_session_repository.cache_clear()
    get_document_repository.cache_clear()
    get_packet_repository.cache_clear()
    get_settings.cache_clear()
