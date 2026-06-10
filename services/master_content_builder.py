import json
import os
from pathlib import Path

from services.llm_client import call_claude

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROMPT_PATH = PROJECT_ROOT / "prompts" / "master_content_brief_prompt.txt"


def load_master_brief_prompt() -> str:
    if not PROMPT_PATH.exists():
        raise FileNotFoundError(f"Prompt file not found: {PROMPT_PATH}")

    return PROMPT_PATH.read_text(encoding="utf-8")


def build_master_brief_prompt(user_input: dict) -> str:
    template = load_master_brief_prompt()

    user_input_json = json.dumps(
        user_input,
        ensure_ascii=False,
        indent=2,
    )

    return template.replace("{{USER_INPUT_JSON}}", user_input_json)


def generate_master_brief(
    user_input: dict,
    max_tokens: int = 4500,
    api_key: str | None = None,
) -> str:
    model = os.getenv("ANTHROPIC_OUTLINE_MODEL", "claude-haiku-4-5")
    prompt = build_master_brief_prompt(user_input=user_input)

    return call_claude(
        prompt=prompt,
        model=model,
        max_tokens=max_tokens,
        api_key=api_key,
    )
