from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROMPT_ROOT = PROJECT_ROOT / "prompts"


def resolve_prompt_path(*path_parts: str) -> Path:
    return PROMPT_ROOT.joinpath(*path_parts)


def load_prompt(*path_parts: str) -> str:
    prompt_path = resolve_prompt_path(*path_parts)

    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_path}")

    return prompt_path.read_text(encoding="utf-8")
