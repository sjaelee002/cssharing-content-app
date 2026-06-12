import os
import json

from services.llm_client import call_claude
from services.prompt_loader import load_prompt

PROMPT_PATH = ("channels", "homepage_magazine", "outline.md")
DEFAULT_MAX_TOKENS = 4500


def _format_master_brief_json(master_brief: dict | str | None) -> str:
    if master_brief is None:
        return "{}"

    if isinstance(master_brief, str):
        return master_brief

    return json.dumps(master_brief, ensure_ascii=False, indent=2)


def build_outline_prompt(
    user_input: dict,
    master_brief: dict | str | None = None,
) -> str:
    template = load_prompt(*PROMPT_PATH)

    user_input_json = json.dumps(
        user_input,
        ensure_ascii=False,
        indent=2,
    )

    master_brief_json = _format_master_brief_json(master_brief)

    prompt = template.replace("{{USER_INPUT_JSON}}", user_input_json)
    prompt = prompt.replace("{{MASTER_BRIEF_JSON}}", master_brief_json)

    return prompt


def generate_outline(
    user_input: dict,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    api_key: str | None = None,
    master_brief: dict | str | None = None,
) -> str:
    model = os.getenv("ANTHROPIC_OUTLINE_MODEL", "claude-haiku-4-5")

    prompt = build_outline_prompt(
        user_input=user_input,
        master_brief=master_brief,
    )

    return call_claude(
        prompt=prompt,
        model=model,
        max_tokens=max_tokens,
        api_key=api_key,
    )
