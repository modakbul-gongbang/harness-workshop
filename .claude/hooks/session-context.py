#!/usr/bin/env python3
"""Restore local task pointers at session boundaries without mutating state."""
import json
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import task


def run(payload):
    if not isinstance(payload, dict) or payload.get("hook_event_name") != "SessionStart":
        raise ValueError("Malformed SessionStart payload")
    lines = ["Workshop context: read CLAUDE.md and docs/README.md; preserve the existing server and data/."]
    try:
        result = subprocess.run(["node", "--version"], cwd=task.ROOT, capture_output=True, text=True, timeout=3)
        version = result.stdout.strip()
        if result.returncode == 0 and version.startswith("v24."):
            lines.append(f"Node {version}; common verification: ./scripts/verify.sh.")
        else:
            lines.append("ENVIRONMENT: Node.js 24 is required; current node is incompatible or failed. Fix PATH before verification.")
    except (OSError, subprocess.TimeoutExpired):
        lines.append("ENVIRONMENT: could not execute node --version; select Node.js 24 before verification.")
    slug = task.active()
    if slug:
        lines.append(f"Active task: {slug}. Read docs/tasks/{slug}/prd.md and .artifacts/{slug}/plan.md if present.")
        lines.append(f"An old report is not current evidence. Run python3 scripts/task.py check {slug} before relying on it.")
    else:
        lines.append("No active task. Ordinary conversation does not require activation; implementation starts from a confirmed PRD.")
    return {"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "\n".join(lines)}}


if __name__ == "__main__":
    try:
        print(json.dumps(run(json.load(sys.stdin)), ensure_ascii=False))
    except (ValueError, OSError, TypeError, KeyError) as error:
        # SessionStart cannot block work; make broken state visible in context.
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext":
              f"CONTEXT ERROR: {error}. Inspect active task state; do not treat this as successful verification."}}, ensure_ascii=False))
        print("session-context: invalid input or task state", file=sys.stderr)
        sys.exit(1)
