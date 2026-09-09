#!/usr/bin/env python3
"""Small local evidence contract, not a workflow engine or a security boundary."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
GUIDES = {"G-BACKEND": "docs/guides/backend.md", "G-FRONTEND": "docs/guides/frontend.md",
          "G-TESTING": "docs/guides/testing.md", "G-MIGRATION": "docs/guides/migration.md"}
EXCLUDED = {".git", "node_modules", ".next", "out", "coverage", "next-env.d.ts", "data", ".artifacts", "__pycache__", ".DS_Store", ".env", ".env.local", "settings.local.json"}


def read_json(path):
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError(f"JSON object required: {path.name}")
    return value


def task_slug(value):
    if not isinstance(value, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value):
        raise ValueError("Invalid task ID")
    return value


def active():
    path = ROOT / ".artifacts/active-task.json"
    if not path.exists():
        return None
    value = read_json(path)
    if set(value) != {"task"}:
        raise ValueError("active-task.json must contain only task")
    return task_slug(value["task"])


def snapshot(slug):
    slug = task_slug(slug)
    prd = f"docs/tasks/{slug}/prd.md"
    text = (ROOT / prd).read_text()
    if not re.search(r"^확정 여부: \*\*확정\*\*(?:[,\.\s]|$)", text, re.M):
        raise ValueError("PRD must declare 확정 여부: **확정** after unresolved product decisions are answered")
    ac = re.findall(r"^\| (AC-\d+) \|", text, re.M)
    if not ac or len(ac) != len(set(ac)):
        raise ValueError("PRD needs unique AC-ID rows")
    sections = re.split(r"^## 검증 범위\s*$", text, flags=re.M)
    if len(sections) != 2:
        raise ValueError("PRD needs exactly one 검증 범위 section")
    scope = re.split(r"^## ", sections[1], maxsplit=1, flags=re.M)[0]
    rows = re.findall(r"^\| (tests|api|ui) \| ([^|\n]+) \| ([^|\n]*) \|$", scope, re.M)
    if len(rows) != 3 or {row[0] for row in rows} != {"tests", "api", "ui"}:
        raise ValueError("PRD needs unique tests/api/ui scope rows")
    surfaces = {}
    for surface, mode, reason in rows:
        if mode not in {"required", "not-applicable"} or not reason.strip():
            raise ValueError(f"Invalid scope or empty reason: {surface}")
        surfaces[surface] = {"mode": mode, "reason": reason.strip()}
    if surfaces["tests"]["mode"] != "required":
        raise ValueError("Common verification tests are always required")
    for path in GUIDES.values():
        if not (ROOT / path).is_file():
            raise ValueError(f"Missing guide: {path}")
    digest = hashlib.sha256()
    paths = []
    for directory, dirs, files in os.walk(ROOT, followlinks=False):
        dirs[:] = sorted(name for name in dirs if name not in EXCLUDED)
        paths.extend(Path(directory) / name for name in dirs if (Path(directory) / name).is_symlink())
        paths.extend(Path(directory) / name for name in files)
    for path in sorted(paths):
        relative = path.relative_to(ROOT)
        if any(part in EXCLUDED or part.endswith((".pyc", ".tsbuildinfo")) for part in relative.parts):
            continue
        if path.is_symlink():
            raise ValueError(f"Symlinks are not supported: {relative}")
        if path.is_file():
            digest.update(relative.as_posix().encode() + b"\0" + path.read_bytes() + b"\0")
    return {"task": slug, "prd": prd, "fingerprint": digest.hexdigest(), "ac_ids": ac, "guides": GUIDES,
            "surfaces": surfaces}


def check(slug):
    expected = snapshot(slug)
    path = ROOT / f".artifacts/{slug}/verification.json"
    if not path.is_file():
        raise ValueError("MISSING: independent verifier report required")
    report = read_json(path)
    if report.get("reviewer") != "verifier":
        raise ValueError("Only the independent verifier authors verification.json")
    if report.get("snapshot") != expected:
        raise ValueError("STALE: task/PRD/guides/source/tests differ from reviewed snapshot")
    for field, identifiers in [("acceptance", expected["ac_ids"]), ("guides", list(GUIDES))]:
        rows = report.get(field)
        if not isinstance(rows, list) or len(rows) != len(identifiers):
            raise ValueError(f"Missing or duplicate {field} results")
        if {row.get("id") for row in rows if isinstance(row, dict)} != set(identifiers):
            raise ValueError(f"Incorrect {field} IDs")
        for row in rows:
            if row.get("status") not in {"PASS", "FAIL", "BLOCKED"} or not isinstance(row.get("evidence"), str) or not row["evidence"].strip():
                raise ValueError(f"Malformed result: {row.get('id')}")
            if row["status"] != "PASS":
                raise ValueError(f"{row['status']}: {row['id']}: {row['evidence']}")
    if not isinstance(report.get("checks"), dict):
        raise ValueError("checks required")
    for surface, policy in expected["surfaces"].items():
        item = report["checks"].get(surface)
        status = "PASS" if policy["mode"] == "required" else "N/A"
        if not isinstance(item, dict) or item.get("status") != status or not isinstance(item.get("evidence"), str) or not item["evidence"].strip():
            raise ValueError(f"Missing or unsuccessful {surface} evidence")
    return "PASS: current independent report covers every AC, guide, and declared verification scope"


def finish(slug):
    current = active()
    if current and current != slug:
        raise ValueError(f"Another task is active: {current}; it will not be cleared")
    result = check(slug)
    if current:
        (ROOT / ".artifacts/active-task.json").unlink()
    return f"{result}\nFINISHED {slug}; report retained for PR delivery"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["activate", "snapshot", "check", "finish", "deactivate"])
    parser.add_argument("task", nargs="?")
    args = parser.parse_args()
    if args.command == "deactivate":
        slug = active()
        if slug:
            print(f"DEACTIVATED {slug}; this does not mark it complete")
            (ROOT / ".artifacts/active-task.json").unlink()
        else:
            print("No active task")
        return
    slug = task_slug(args.task)
    if args.command == "activate":
        snapshot(slug)
        current = active()
        if current and current != slug:
            raise ValueError(f"Another task is active: {current}; deactivate explicitly first")
        (ROOT / f".artifacts/{slug}").mkdir(parents=True, exist_ok=True)
        (ROOT / ".artifacts/active-task.json").write_text(json.dumps({"task": slug}) + "\n")
        print(f"ACTIVE {slug}")
    elif args.command == "snapshot":
        print(json.dumps(snapshot(slug), ensure_ascii=False, indent=2))
    elif args.command == "finish":
        print(finish(slug))
    else:
        print(check(slug))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, TypeError, KeyError) as error:
        print(f"BLOCKED: {error}", file=sys.stderr)
        sys.exit(1)
