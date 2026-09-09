#!/usr/bin/env python3
"""Path guidance plus cooperative separation of implementation and evidence roles."""
import json
from pathlib import Path
import re
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import task


def output(**fields):
    return {"hookSpecificOutput": {"hookEventName": "PreToolUse", **fields}}


def run(payload):
    if not isinstance(payload, dict) or payload.get("hook_event_name") != "PreToolUse" or not isinstance(payload.get("tool_input"), dict) or not isinstance(payload.get("tool_name"), str):
        raise ValueError("Malformed PreToolUse payload")
    tool = payload["tool_name"]
    data = payload["tool_input"]
    verifier = payload.get("agent_type") == "verifier"
    if tool == "Bash":
        command = data.get("command")
        if not isinstance(command, str):
            raise ValueError("Bash command required")
        if verifier and not (command == "./scripts/verify.sh" or re.fullmatch(r"python3 scripts/task.py (snapshot|check) [a-z0-9]+(?:-[a-z0-9]+)*", command)):
            return output(permissionDecision="deny", permissionDecisionReason="Verifier Bash only allows ./scripts/verify.sh and task.py snapshot/check. Read files with Read; write reports with Write. No code edits.")
        return {}
    if tool not in {"Write", "Edit"}:
        return {}
    value = data.get("file_path")
    if not isinstance(value, str) or not value:
        raise ValueError("file_path required")
    path = Path(value)
    if not path.is_absolute():
        path = task.ROOT / path
    try:
        relative = path.resolve().relative_to(task.ROOT).as_posix()
    except ValueError:
        return output(permissionDecision="deny", permissionDecisionReason="Stay inside this sample project.")
    is_report = bool(re.fullmatch(r"\.artifacts/[a-z0-9-]+/verification\.(json|md)", relative))
    if verifier:
        slug = task.active()
        if not slug or relative not in {f".artifacts/{slug}/verification.json", f".artifacts/{slug}/verification.md"}:
            return output(permissionDecision="deny", permissionDecisionReason="Verifier may write only the active task's verification.json/md; code editing is prohibited.")
    elif is_report:
        return output(permissionDecision="deny", permissionDecisionReason="Independent verifier owns verification.json/md. Implementer must not manufacture PASS.")
    guide = None
    if relative in {"src/server/config.ts", "src/server/database.ts", "src/instrumentation.ts", "next.config.ts", ".env.example"}:
        guide = "docs/guides/backend.md and docs/guides/migration.md"
    elif relative.startswith(("src/server/", "src/app/api/", "src/app/logout/")):
        guide = "docs/guides/backend.md"
    elif relative.startswith(("src/app/", "src/components/")):
        guide = "docs/guides/frontend.md"
    elif relative.startswith(("tests/", "scripts/", ".claude/hooks/")):
        guide = "docs/guides/testing.md"
    if guide:
        return output(additionalContext=f"Before changing {relative}, read {guide}. Preserve the active PRD and baseline contract. No full test per edit; verify before completion.")
    return {}


if __name__ == "__main__":
    try:
        print(json.dumps(run(json.load(sys.stdin)), ensure_ascii=False))
    except (ValueError, OSError, TypeError, KeyError) as error:
        print(f"BLOCKED: invalid hook input/state: {error}", file=sys.stderr)
        sys.exit(2)
