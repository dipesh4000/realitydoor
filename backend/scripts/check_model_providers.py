from __future__ import annotations

import asyncio

import httpx

from app.core.config import get_settings


async def check(name: str, base_url: str, api_key: str, model: str) -> None:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Reply with only: ready"}],
        "temperature": 0,
        "max_tokens": 64,
    }
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            f"{base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
    body = response.json()
    choices = body.get("choices") or []
    content = choices[0].get("message", {}).get("content") if choices else None
    error = body.get("error") or {}
    print({
        "provider": name,
        "status": response.status_code,
        "usable_content": isinstance(content, str) and bool(content.strip()),
        "selected_model": body.get("model"),
        "error_code": error.get("code"),
    })


async def main() -> None:
    settings = get_settings()
    await check("nvidia", settings.nvidia_base_url, settings.nvidia_api_key, settings.nvidia_chat_model)
    await check("openrouter", settings.openrouter_base_url, settings.openrouter_api_key, settings.openrouter_chat_model)


if __name__ == "__main__":
    asyncio.run(main())
