"""Behavior contracts for the local gate, using disposable complete project fixtures."""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import task

ROOT = Path(__file__).resolve().parents[1]


class HarnessTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for name in ("scripts", ".claude", "docs"):
            shutil.copytree(ROOT / name, self.root / name, ignore=shutil.ignore_patterns("__pycache__"))
        (self.root / "src").mkdir()
        (self.root / "src/code.ts").write_text("export const example = 1;")
        (self.root / "src/test.ts").write_text("export const expected = 1;")
        (self.root / "package-lock.json").write_text("{}")
        self.original = task.ROOT
        task.ROOT = self.root
        self.slug = "status-filter"
        (self.root / ".artifacts" / self.slug).mkdir(parents=True)
        self.active = self.root / ".artifacts/active-task.json"
        self.active.write_text(json.dumps({"task": self.slug}))
        self.report = self.root / f".artifacts/{self.slug}/verification.json"

    def tearDown(self):
        task.ROOT = self.original
        self.temp.cleanup()

    def hook(self, payload, name="check-completion.py"):
        raw = payload if isinstance(payload, str) else json.dumps(payload)
        result = subprocess.run(["python3", str(self.root / ".claude/hooks" / name)], input=raw,
                                text=True, capture_output=True, cwd=self.root)
        return result, json.loads(result.stdout) if result.stdout else {}

    def stop(self, again=False, message=None):
        return self.hook({"hook_event_name": "Stop", "stop_hook_active": again,
                          "last_assistant_message": message or f"Done [TASK_COMPLETE:{self.slug}]"})

    def valid(self):
        snapshot = task.snapshot(self.slug)
        report = {"reviewer": "verifier", "snapshot": snapshot,
                  "acceptance": [{"id": ac, "status": "PASS", "evidence": "fixture observation"} for ac in snapshot["ac_ids"]],
                  "guides": [{"id": key, "status": "PASS", "evidence": "fixture review"} for key in snapshot["guides"]],
                  "checks": {key: {"status": "PASS", "evidence": "fixture execution"} for key in ("tests", "api", "ui")}}
        self.report.write_text(json.dumps(report))
        return report

    def command(self, command, slug=None):
        return subprocess.run(["python3", str(self.root / "scripts/task.py"), command, slug or self.slug],
                              text=True, capture_output=True, cwd=self.root)

    def scopes(self, ui="required", reason="화면 동작 확인"):
        path = self.root / f"docs/tasks/{self.slug}/prd.md"
        content = path.read_text().split("## 검증 범위")[0]
        path.write_text(content + "\n## 검증 범위\n\n| Surface | 적용 | 이유 |\n| --- | --- | --- |\n"
                        "| tests | required | 공통 검증 |\n| api | required | API 계약 |\n"
                        f"| ui | {ui} | {reason} |\n")

    def test_only_confirmed_prds_can_activate(self):
        path = self.root / f"docs/tasks/{self.slug}/prd.md"
        path.write_text(path.read_text().replace("**확정**", "**초안**"))
        self.active.unlink()
        result = self.command("activate")
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertFalse(self.active.exists())

    def test_na_requires_prior_scope_and_independent_evidence(self):
        self.scopes()
        report = self.valid()
        report["checks"]["ui"] = {"status": "N/A", "evidence": "브라우저 도구 없음"}
        self.report.write_text(json.dumps(report))
        self.assertEqual(self.stop()[1]["decision"], "block")
        self.scopes("not-applicable", "앱 화면 변경 없는 CLI 수정")
        report = self.valid()
        report["checks"]["ui"] = {"status": "N/A", "evidence": "diff상 scripts만 변경; UI 호출 경로 영향 없음"}
        self.report.write_text(json.dumps(report))
        result = self.stop()[1]
        self.assertNotIn("decision", result, result)
        self.assertIn("PASS", result.get("systemMessage", ""))
        report["checks"]["ui"]["evidence"] = " "
        self.report.write_text(json.dumps(report))
        self.assertEqual(self.stop()[1]["decision"], "block")
        self.scopes()
        report = self.valid()
        report["checks"]["ui"]["status"] = "BLOCKED"
        self.report.write_text(json.dumps(report))
        self.assertEqual(self.stop()[1]["decision"], "block")
        self.scopes("not-applicable", "")
        self.assertNotEqual(self.command("snapshot").returncode, 0)

    def test_scope_rows_cannot_be_missing_duplicated_or_disable_tests(self):
        self.scopes()
        path = self.root / f"docs/tasks/{self.slug}/prd.md"
        original = path.read_text()
        for content in (original.replace("| ui | required | 화면 동작 확인 |", ""),
                        original + "| ui | required | duplicate |\n",
                        original.replace("| tests | required |", "| tests | not-applicable |")):
            with self.subTest(content=content[-180:]):
                path.write_text(content)
                self.assertNotEqual(self.command("snapshot").returncode, 0)
        path.write_text(original)

    def test_finish_requires_fresh_pass_and_only_clears_its_task(self):
        self.assertNotEqual(self.command("finish").returncode, 0)
        self.assertTrue(self.active.exists())
        report = self.valid()
        report["acceptance"][0]["status"] = "FAIL"
        self.report.write_text(json.dumps(report))
        self.assertNotEqual(self.command("finish").returncode, 0)
        self.assertTrue(self.active.exists())
        self.valid()
        code = self.root / "src/code.ts"
        code.write_text("changed")
        self.assertNotEqual(self.command("finish").returncode, 0)
        self.assertTrue(self.active.exists())
        self.valid()
        self.active.write_text(json.dumps({"task": "extract-list-service"}))
        self.assertNotEqual(self.command("finish").returncode, 0)
        self.assertEqual(json.loads(self.active.read_text())["task"], "extract-list-service")
        self.active.write_text(json.dumps({"task": self.slug}))
        result = self.command("finish")
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertFalse(self.active.exists())
        self.assertEqual(self.command("check").returncode, 0)
        self.assertEqual(self.command("activate", "extract-list-service").returncode, 0)

    def test_missing_blocks_once_and_retry_exits_incomplete(self):
        self.assertEqual(self.stop()[1]["decision"], "block")
        bounded = self.stop(True)[1]
        self.assertNotIn("decision", bounded)
        self.assertIn("BLOCKED", bounded["systemMessage"])
        self.assertNotIn("PASS", bounded["systemMessage"])

    def test_pass_requires_all_ids_and_surfaces(self):
        self.valid()
        self.assertIn("PASS", self.stop()[1]["systemMessage"])
        for alteration in ("fail", "missing_ac", "missing_guide", "missing_ui", "wrong_task", "wrong_reviewer", "duplicate"):
            with self.subTest(alteration=alteration):
                report = self.valid()
                if alteration == "fail": report["acceptance"][0]["status"] = "FAIL"
                if alteration == "missing_ac": report["acceptance"].pop()
                if alteration == "missing_guide": report["guides"].pop()
                if alteration == "missing_ui": report["checks"].pop("ui")
                if alteration == "wrong_task": report["snapshot"]["task"] = "other"
                if alteration == "wrong_reviewer": report["reviewer"] = "implementer"
                if alteration == "duplicate": report["acceptance"][1] = report["acceptance"][0]
                self.report.write_text(json.dumps(report))
                self.assertEqual(self.stop()[1]["decision"], "block")

    def test_source_tests_prd_and_guides_invalidate_but_artifacts_do_not(self):
        for name in ("src/code.ts", "src/test.ts", "docs/tasks/status-filter/prd.md", "docs/guides/backend.md", "package-lock.json"):
            with self.subTest(name=name):
                self.valid()
                path = self.root / name
                original = path.read_text()
                path.write_text(original + "\nchanged\n")
                self.assertIn("STALE", self.stop()[1]["reason"])
                path.write_text(original)
        self.valid()
        (self.root / ".artifacts/status-filter/screenshot.png").write_bytes(b"image")
        self.assertIn("PASS", self.stop()[1]["systemMessage"])
        for directory in ("node_modules", ".next"):
            (self.root / directory).mkdir()
            (self.root / directory / "output.js").write_text("generated")
        (self.root / "next-env.d.ts").write_text("generated")
        (self.root / "tsconfig.tsbuildinfo").write_text("generated")
        self.assertIn("PASS", self.stop()[1]["systemMessage"])
        (self.root / "src/new.ts").write_text("new")
        self.assertIn("STALE", self.stop()[1]["reason"])

    def test_inactive_conversation_and_explicit_blocked_exit(self):
        self.assertEqual(self.stop(message="가이드를 작성했습니다.")[1], {})
        self.assertIn("BLOCKED", self.stop(message=f"브라우저 없음 [TASK_BLOCKED:{self.slug}]")[1]["systemMessage"])
        self.active.unlink()
        self.assertEqual(self.stop()[1], {})

    def test_malformed_input_state_and_report_never_silently_pass(self):
        for payload in ("{broken", "[]", "{}"):
            result, output = self.hook(payload)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("BLOCKED", output["systemMessage"])
        self.active.write_text('{"task":"../escape"}')
        self.assertEqual(self.stop()[1]["decision"], "block")
        self.assertIn("BLOCKED", self.stop(True)[1]["systemMessage"])
        self.active.write_text(json.dumps({"task": self.slug}))
        self.report.write_text("{broken")
        self.assertEqual(self.stop()[1]["decision"], "block")

    def tool(self, name, data, agent=None):
        return self.hook({"hook_event_name": "PreToolUse", "tool_name": name, "tool_input": data,
                          "agent_type": agent}, "remind-guide.py")

    def test_role_separation_and_path_guidance(self):
        path = str(self.report)
        self.assertEqual(self.tool("Write", {"file_path": path})[1]["hookSpecificOutput"]["permissionDecision"], "deny")
        self.assertEqual(self.tool("Write", {"file_path": path}, "verifier")[1], {})
        self.assertEqual(self.tool("Write", {"file_path": "src/code.ts"}, "verifier")[1]["hookSpecificOutput"]["permissionDecision"], "deny")
        self.assertEqual(self.tool("Bash", {"command": "./scripts/verify.sh"}, "verifier")[1], {})
        self.assertEqual(self.tool("Bash", {"command": "./scripts/verify.sh; touch src/code.ts"}, "verifier")[1]["hookSpecificOutput"]["permissionDecision"], "deny")
        reminder = self.tool("Edit", {"file_path": "src/server/web/test.ts"})[1]
        self.assertIn("backend.md", reminder["hookSpecificOutput"]["additionalContext"])
        for path, guide in (("src/app/page.tsx", "frontend.md"), ("src/components/todo-app.tsx", "frontend.md"), ("src/app/api/todos/route.ts", "backend.md"), ("src/server/config.ts", "migration.md"), ("tests/api.test.ts", "testing.md")):
            reminder = self.tool("Edit", {"file_path": path})[1]
            self.assertIn(guide, reminder["hookSpecificOutput"]["additionalContext"])
        result, _ = self.tool("Edit", {})
        self.assertEqual(result.returncode, 2)


if __name__ == "__main__":
    unittest.main()
