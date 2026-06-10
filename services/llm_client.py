import os
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

_runtime_api_key: str | None = None


def _get_api_key() -> str | None:
    if _runtime_api_key:
        return _runtime_api_key
    return os.getenv("ANTHROPIC_API_KEY")


def _get_client() -> Anthropic:
    api_key = _get_api_key()
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY is missing. Check your .env file or set it in the UI.")
    return Anthropic(api_key=api_key)


def set_runtime_api_key(api_key: str | None) -> None:
    global _runtime_api_key
    _runtime_api_key = api_key.strip() if api_key else None


def has_api_key() -> bool:
    return bool(_get_api_key())


def api_key_source() -> str:
    if _runtime_api_key:
        return "session"
    if os.getenv("ANTHROPIC_API_KEY"):
        return "env"
    return "none"


def call_claude(prompt: str, model: str, max_tokens: int = 1200) -> str:
    client = _get_client()

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