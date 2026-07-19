from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Application configuration loaded from the repository-level .env file."""

    model_config = SettingsConfigDict(
        env_file=REPOSITORY_ROOT / "backend/.env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: str = "development"
    app_name: str = "RealDoor API"
    api_prefix: str = "/api"
    frontend_origins: str = "http://localhost:5173"

    supabase_url: str = ""
    supabase_secret_key: str = Field(default="", repr=False)
    database_url: str = Field(default="", repr=False)
    direct_database_url: str = Field(default="", repr=False)
    supabase_document_bucket: str = "renter-documents"
    supabase_packet_bucket: str = "readiness-packets"

    openrouter_api_key: str = Field(default="", repr=False)
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_free_models_only: bool = True
    openrouter_chat_model: str = "openrouter/free"

    nvidia_api_key: str = Field(default="", repr=False)
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_retrieval_base_url: str = "https://ai.api.nvidia.com/v1/retrieval"
    nvidia_chat_model: str = "nvidia/nemotron-3-nano-30b-a3b"
    nvidia_strong_model: str = "nvidia/nemotron-3-super-120b-a12b"
    nvidia_embedding_model: str = "nvidia/llama-nemotron-embed-1b-v2"
    nvidia_embedding_dimensions: int = Field(default=1024, ge=384, le=2048)
    nvidia_rerank_model: str = "nvidia/llama-nemotron-rerank-1b-v2"
    nvidia_ocr_enabled: bool = True
    nvidia_ocr_model: str = "nvidia/nemotron-ocr-v2"

    use_in_memory_repository: bool = False
    session_cookie_name: str = "realdoor_session"
    session_ttl_minutes: int = Field(default=60, ge=5, le=1440)
    packet_ttl_minutes: int = Field(default=60, ge=5, le=1440)
    max_upload_mb: int = Field(default=50, ge=1, le=100)
    max_document_pages: int = Field(default=50, ge=1, le=200)

    @field_validator("app_env")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"development", "test", "production"}:
            raise ValueError("APP_ENV must be development, test, or production")
        return normalized

    @property
    def cors_origins(self) -> list[str]:
        origins = [item.strip() for item in self.frontend_origins.split(",") if item.strip()]
        if not origins or "*" in origins:
            raise ValueError("FRONTEND_ORIGINS must list explicit origins when session cookies are enabled")
        return origins

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
