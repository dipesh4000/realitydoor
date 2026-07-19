import asyncio
import re

from fastapi import APIRouter, Cookie, Depends
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_session_repository
from app.api.routes.documents import require_session
from app.core.config import Settings, get_settings
from app.repositories.sessions import SessionRepository
from app.schemas.chat import ChatCompleteEvent, ChatDeltaEvent, ChatRequest, ChatResponse
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


@router.post("/stream")
async def chat_stream(
    payload: ChatRequest,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    settings: Settings = Depends(get_settings),
) -> StreamingResponse:
    await require_session(raw_session_id, sessions)

    async def events():
        response = await answer_chat(payload.message, settings, payload.context)
        chunks = re.findall(r"\S+\s*", response.reply)
        for index in range(0, len(chunks), 4):
            event = ChatDeltaEvent(delta="".join(chunks[index:index + 4]))
            yield event.model_dump_json() + "\n"
            await asyncio.sleep(0)
        complete = ChatCompleteEvent(
            answer=response.answer,
            sources=response.sources,
            route=response.route,
            model=response.model,
            disclaimer=response.disclaimer,
        )
        yield complete.model_dump_json() + "\n"

    return StreamingResponse(
        events(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )
