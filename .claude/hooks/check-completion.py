#!/usr/bin/env python3
"""Gate explicit task-completion claims; never run tests on every edit."""
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import task


def run(payload):
    if not isinstance(payload, dict) or payload.get("hook_event_name") != "Stop" or type(payload.get("stop_hook_active")) is not bool or not isinstance(payload.get("last_assistant_message"), str):
        raise ValueError("Malformed Stop payload")
    try:
        slug = task.active()
        if not slug:
            return {}
        message = payload["last_assistant_message"]
        if f"[TASK_BLOCKED:{slug}]" in message:
            return {"systemMessage": f"BLOCKED {slug}: task remains active and incomplete; report the obstacle and next action."}
        if f"[TASK_COMPLETE:{slug}]" not in message:
            return {}  # Ordinary discussion/PRD writing is not a completion claim.
        result = task.check(slug)
        return {"systemMessage": result}
    except (ValueError, OSError, TypeError, KeyError) as error:
        reason = f"BLOCKED: {error}. Fix and request a fresh verifier; otherwise report [TASK_BLOCKED:{locals().get('slug', 'unknown')}] with the reason. Do not claim completion."
        if payload["stop_hook_active"]:
            # One retry only; deliberately do not convert this bounded exit to PASS.
            return {"systemMessage": reason + " Stop retry limit reached; ending incomplete."}
        return {"decision": "block", "reason": reason}


if __name__ == "__main__":
    try:
        print(json.dumps(run(json.load(sys.stdin)), ensure_ascii=False))
    except (ValueError, OSError, TypeError, KeyError) as error:
        print(json.dumps({"systemMessage": f"BLOCKED: invalid hook input/state: {error}"}, ensure_ascii=False))
        sys.exit(1)  # Visible hook error, not silent PASS; malformed input cannot safely be retried.
