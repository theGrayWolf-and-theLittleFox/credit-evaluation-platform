from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {".md", ".py", ".ts", ".tsx", ".js", ".json", ".yml", ".yaml", ".toml", ".txt"}
RESTRICTED_PHRASES = (
    "national interest " + "waiver",
    "immigration " + "petition",
    "petition " + "beneficiary",
    "usc" + "is",
    "i-" + "140",
)


def tracked_text_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    return [
        ROOT / raw.decode("utf-8")
        for raw in result.stdout.split(b"\x00")
        if raw and Path(raw.decode("utf-8")).suffix.lower() in TEXT_SUFFIXES
    ]


def scan() -> list[str]:
    violations: list[str] = []
    for path in tracked_text_files():
        content = path.read_text(encoding="utf-8", errors="ignore").lower()
        for phrase in RESTRICTED_PHRASES:
            if phrase in content:
                violations.append(f"{path.relative_to(ROOT)}: restricted context phrase detected")
    return violations


def main() -> int:
    violations = scan()
    if violations:
        print("Public-content policy check failed:", file=sys.stderr)
        print("\n".join(f"- {violation}" for violation in violations), file=sys.stderr)
        return 1
    print("Public-content policy check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
