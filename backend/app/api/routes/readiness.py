from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends

from app.api.dependencies import get_document_repository, get_session_repository
from app.api.routes.documents import require_session
from app.repositories.documents import DocumentRepository
from app.repositories.sessions import SessionRepository
from app.schemas.readiness import ReadinessResponse
from app.services.readiness import evaluate_readiness


router = APIRouter(prefix="/readiness", tags=["readiness"])


@router.get("", response_model=ReadinessResponse)
async def get_readiness(
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
) -> ReadinessResponse:
    session_id = await require_session(raw_session_id, sessions)
    return await evaluate_readiness(session_id, documents)
