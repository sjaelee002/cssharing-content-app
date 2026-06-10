import os
import json
from pathlib import Path

from services.llm_client import call_claude


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROMPT_DIR = PROJECT_ROOT / "prompts"


PROMPT_FILES = {
    "naver_blog": "naver_blog_outline_prompt.txt",
    "homepage_magazine": "homepage_magazine_outline_prompt.txt",
}


def load_prompt_template(channel: str) -> str:
    if channel not in PROMPT_FILES:
        valid_channels = ", ".join(PROMPT_FILES.keys())
        raise ValueError(f"Unknown channel: {channel}. Valid channels: {valid_channels}")

    prompt_path = PROMPT_DIR / PROMPT_FILES[channel]

    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_path}")

    return prompt_path.read_text(encoding="utf-8")


def _format_master_brief_json(master_brief: dict | str | None) -> str:
    if master_brief is None:
        return "{}"

    if isinstance(master_brief, str):
        return master_brief

    return json.dumps(master_brief, ensure_ascii=False, indent=2)


def build_outline_prompt(
    user_input: dict,
    channel: str = "naver_blog",
    master_brief: dict | str | None = None,
) -> str:
    template = load_prompt_template(channel)

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
    channel: str = "naver_blog",
    max_tokens: int = 3500,
    api_key: str | None = None,
    master_brief: dict | str | None = None,
) -> str:
    model = os.getenv("ANTHROPIC_OUTLINE_MODEL", "claude-haiku-4-5")

    prompt = build_outline_prompt(
        user_input=user_input,
        channel=channel,
        master_brief=master_brief,
    )

    return call_claude(
        prompt=prompt,
        model=model,
        max_tokens=max_tokens,
        api_key=api_key,
    )


def clean_json_response(text: str) -> str:
    text = text.strip()

    if text.startswith("```json"):
        text = text.removeprefix("```json").strip()

    if text.startswith("```"):
        text = text.removeprefix("```").strip()

    if text.endswith("```"):
        text = text.removesuffix("```").strip()

    return text
