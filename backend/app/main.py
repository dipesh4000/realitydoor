from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api.router import api_router
from app.core.config import REPOSITORY_ROOT, get_settings
from app.core.request_id import RequestIdMiddleware


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description=(
            "Evidence-first LIHTC application-readiness API. "
            "This service does not determine housing eligibility."
        ),
    )
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
        max_age=86400,
    )
    app.include_router(api_router, prefix=settings.api_prefix)

    frontend_dist = REPOSITORY_ROOT / "frontend" / "dist"
    if frontend_dist.is_dir() and (frontend_dist / "index.html").is_file():
        @app.get("/{requested_path:path}", include_in_schema=False)
        async def frontend(requested_path: str):
            candidate = (frontend_dist / requested_path).resolve()
            if candidate.is_relative_to(frontend_dist.resolve()) and candidate.is_file():
                return FileResponse(
                    candidate,
                    headers={"Cache-Control": "public, max-age=31536000, immutable"}
                    if requested_path.startswith("assets/")
                    else {"Cache-Control": "no-cache"},
                )
            return FileResponse(frontend_dist / "index.html", headers={"Cache-Control": "no-cache"})
    else:
        @app.get("/", include_in_schema=False)
        async def root() -> dict[str, str]:
            return {"service": "RealDoor API", "docs": "/docs"}

    return app


app = create_app()
