import json
import os

from services.llm_client import call_claude
from services.prompt_loader import load_prompt


def load_master_brief_prompt() -> str:
    return load_prompt("core", "master_content_brief.md")


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
