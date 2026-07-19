import asyncio

from app.core.config import Settings
from app.services import chat as chat_service


def test_empty_primary_provider_falls_back(monkeypatch):
    calls = []

    async def fake_call(**kwargs):
        calls.append(kwargs["model"])
        if len(calls) == 1:
            raise ValueError("empty final content")
        return "Grounded fallback answer [RULE-MTSP-DEFINITION-2026]"

    monkeypatch.setattr(chat_service, "_call_openai_compatible", fake_call)
    settings = Settings(
        app_env="test",
        nvidia_api_key="test-nvidia",
        openrouter_api_key="test-openrouter",
        openrouter_free_models_only=True,
    )
    result = asyncio.run(chat_service.answer_chat("Explain the MTSP definition", settings))
    assert result.route == "openrouter"
    assert calls == [settings.nvidia_chat_model, settings.openrouter_chat_model]
