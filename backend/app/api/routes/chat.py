from fastapi import APIRouter, Cookie, Depends

from app.api.dependencies import get_session_repository
from app.api.routes.documents import require_session
from app.core.config import Settings, get_settings
from app.repositories.sessions import SessionRepository
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import answer_chat


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    settings: Settings = Depends(get_settings),
) -> ChatResponse:
    await require_session(raw_session_id, sessions)
    return await answer_chat(payload.message, settings, payload.context)
