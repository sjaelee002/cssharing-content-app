from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
GUIDE_ROOT = PROJECT_ROOT / "guides"


def read_text_file(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Guide file not found: {path}")

    return path.read_text(encoding="utf-8")


def load_guide(channel: str, filename: str) -> str:
    guide_path = GUIDE_ROOT / channel / filename
    return read_text_file(guide_path)


def load_guides(channel: str, filenames: list[str]) -> dict[str, str]:
    return {filename: load_guide(channel, filename) for filename in filenames}
