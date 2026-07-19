from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter


router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "realdoor-api",
        "timestamp": datetime.now(UTC).isoformat(),
    }

