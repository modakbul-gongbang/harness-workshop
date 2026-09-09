#!/usr/bin/env python3
"""Give read-only ESLint feedback for one edited project source file."""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def context(message):
    return {"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": message}}


def run(payload):
    if not isinstance(payload, dict) or payload.get("hook_event_name") != "PostToolUse" or not isinstance(payload.get("tool_input"), dict):
        raise ValueError("Malformed PostToolUse payload")
    if payload.get("tool_name") not in {"Write", "Edit"}:
        return {}
    value = payload["tool_input"].get("file_path")
    if not isinstance(value, str) or not value:
        raise ValueError("file_path required")
    path = Path(value)
    path = (path if path.is_absolute() else ROOT / path).resolve()
    try:
        relative = path.relative_to(ROOT)
    except ValueError:
        raise ValueError("Edited file is outside the project") from None
    if not relative.parts:
        raise ValueError("file_path must name a file, not the project root")
    target = (relative.parts[0] in {"src", "tests"} and path.suffix in {".ts", ".tsx"}) or relative.as_posix() == "next.config.ts"
    if not target:
        return {}
    if not path.is_file():
        raise ValueError("Edited source file is missing")
    eslint = ROOT / "node_modules/eslint/bin/eslint.js"
    if not eslint.is_file():
        return context("LINT NOT RUN: local ESLint is missing. Run npm ci with Node.js 24, then npm run lint.")
    # stdin avoids interpreting names such as [id] or shell metacharacters as globs/commands.
    result = subprocess.run(["node", str(eslint), "--stdin", "--stdin-filename", str(path), "--max-warnings", "0"],
                            cwd=ROOT, input=path.read_text(), capture_output=True, text=True, timeout=20)
    if result.returncode == 0:
        return {}
    diagnostic = (result.stdout + result.stderr).strip()[:4000]
    status = "LINT FAILED" if result.returncode == 1 else "LINT NOT RUN"
    return context(f"{status} for {relative.as_posix()} (exit {result.returncode}):\n{diagnostic}\n"
                   "The edit is already saved. Fix these diagnostics; this single-file check does not replace ./scripts/verify.sh or independent review.")


if __name__ == "__main__":
    try:
        print(json.dumps(run(json.load(sys.stdin)), ensure_ascii=False))
    except subprocess.TimeoutExpired:
        print(json.dumps(context("LINT NOT RUN: the 20-second limit was reached. Run npm run lint and inspect the cause.")))
    except (ValueError, OSError, TypeError, KeyError) as error:
        print(json.dumps(context(f"LINT NOT RUN: {error}. Inspect hook input/environment and run npm run lint."), ensure_ascii=False))
        print("lint-changed-file: invalid input or execution failure", file=sys.stderr)
        sys.exit(1)
