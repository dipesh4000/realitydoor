from fastapi import APIRouter

from app.api.routes import chat, documents, health, income, packets, readiness, rules, session


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(session.router)
api_router.include_router(income.router)
api_router.include_router(rules.rules_router)
api_router.include_router(rules.limits_router)
api_router.include_router(documents.router)
api_router.include_router(readiness.router)
api_router.include_router(chat.router)
api_router.include_router(packets.router)
