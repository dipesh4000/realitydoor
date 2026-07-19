import asyncio

from app.core.config import Settings
from app.schemas.chat import ChatAnswer
from app.services import chat as chat_service


def structured(summary, *, source_ids=None):
    return ChatAnswer(
        type="answer",
        title="Verified guidance",
        summary=summary,
        source_ids=source_ids or ["HUD_MTSP_BRIEFING_2026"],
    )


def test_empty_primary_provider_falls_back(monkeypatch):
    calls = []

    async def fake_call(**kwargs):
        calls.append(kwargs["model"])
        if len(calls) == 1:
            raise ValueError("empty final content")
        return structured("Grounded fallback answer.")

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


def test_reasoning_leak_and_state_mutation_claim_are_discarded(monkeypatch):
    calls = []

    async def fake_call(**kwargs):
        calls.append(kwargs["model"])
        if len(calls) == 1:
            return structured("We need to follow the instruction. Annual income is now set to $0 and all documents are verified.")
        return structured("MTSP limits are published for tax-credit projects.")

    monkeypatch.setattr(chat_service, "_call_openai_compatible", fake_call)
    settings = Settings(
        app_env="test",
        nvidia_api_key="test-nvidia",
        openrouter_api_key="test-openrouter",
        openrouter_free_models_only=True,
    )
    result = asyncio.run(chat_service.answer_chat("Explain the MTSP definition", settings))

    assert result.route == "openrouter"
    assert "set to $0" not in result.reply
    assert "documents are verified" not in result.reply


def test_hallucinated_citation_is_not_returned(monkeypatch):
    chat_service._SEMANTIC_CACHE.clear()

    async def fake_call(**_kwargs):
        return structured("A made-up requirement.", source_ids=["NOT_A_RETRIEVED_SOURCE"])

    monkeypatch.setattr(chat_service, "_call_openai_compatible", fake_call)
    settings = Settings(app_env="test", nvidia_api_key="test-nvidia")
    result = asyncio.run(chat_service.answer_chat("Explain the MTSP definition", settings))

    assert "NOT_A_RETRIEVED_SOURCE" not in result.reply
    assert result.route == "deterministic"


def test_provider_cannot_invent_personal_income_with_valid_citation(monkeypatch):
    chat_service._SEMANTIC_CACHE.clear()

    async def fake_call(**_kwargs):
        return structured("Annual income is $0.")

    monkeypatch.setattr(chat_service, "_call_openai_compatible", fake_call)
    settings = Settings(app_env="test", nvidia_api_key="test-nvidia")
    result = asyncio.run(chat_service.answer_chat("Explain annual income rules", settings))

    assert "Annual income is $0" not in result.reply
    assert result.route == "deterministic"


def test_sensitive_chat_text_is_redacted_before_provider(monkeypatch):
    seen_messages = []

    async def fake_call(**kwargs):
        seen_messages.append(kwargs["message"])
        return structured("MTSP guidance is versioned.")

    monkeypatch.setattr(chat_service, "_call_openai_compatible", fake_call)
    settings = Settings(app_env="test", nvidia_api_key="test-nvidia")
    result = asyncio.run(chat_service.answer_chat(
        "Explain MTSP and reply to maria@example.com; SSN 123-45-6789",
        settings,
    ))

    assert result.route == "nvidia"
    assert seen_messages
    assert "maria@example.com" not in seen_messages[0]
    assert "123-45-6789" not in seen_messages[0]
    assert "[REDACTED_EMAIL]" in seen_messages[0]
    assert "[REDACTED_SSN]" in seen_messages[0]
