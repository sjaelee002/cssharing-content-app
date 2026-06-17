import os
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

_runtime_api_key: str | None = None


def _normalize_api_key(api_key: str | None) -> str | None:
    if not api_key:
        return None
    stripped = api_key.strip()
    return stripped or None


def _select_api_key(api_key: str | None = None) -> str | None:
    normalized = _normalize_api_key(api_key)
    if normalized:
        return normalized
    if _runtime_api_key:
        return _runtime_api_key
    return os.getenv("ANTHROPIC_API_KEY")


def set_runtime_api_key(api_key: str | None) -> None:
    global _runtime_api_key
    _runtime_api_key = _normalize_api_key(api_key)


def has_api_key(api_key: str | None = None) -> bool:
    return bool(_select_api_key(api_key))


def api_key_source(api_key: str | None = None) -> str:
    if _normalize_api_key(api_key):
        return "request"
    if _runtime_api_key:
        return "session"
    if os.getenv("ANTHROPIC_API_KEY"):
        return "env"
    return "none"


def call_claude(
    prompt: str,
    model: str,
    max_tokens: int = 1200,
    api_key: str | None = None,
) -> str:
    selected_api_key = _select_api_key(api_key)
    if not selected_api_key:
        raise ValueError(
            "ANTHROPIC_API_KEY is missing. Check your .env file or provide one in the UI."
        )

    client = Anthropic(api_key=selected_api_key)

    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
    )

    return response.content[0].text
