"""Exercise editor hooks as processes with real local ESLint and disposable files."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class EditorHookTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="workshop-hooks-")
        self.root = Path(self.temp.name)
        for name in ("scripts", ".claude"):
            shutil.copytree(ROOT / name, self.root / name, ignore=shutil.ignore_patterns("__pycache__"))
        for name in ("eslint.config.mjs", "package.json"):
            shutil.copy2(ROOT / name, self.root / name)
        (self.root / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)
        (self.root / "src").mkdir()
        self.artifacts = self.root / ".artifacts"
        self.artifacts.mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def hook(self, name, payload, env=None):
        result = subprocess.run([sys.executable, str(self.root / ".claude/hooks" / name)],
                                input=payload if isinstance(payload, str) else json.dumps(payload),
                                text=True, capture_output=True, cwd=self.root, env=env, timeout=30)
        output = json.loads(result.stdout)
        return result, output.get("hookSpecificOutput", {}).get("additionalContext", "")

    def edit(self, path, tool="Edit"):
        return self.hook("lint-changed-file.py", {"hook_event_name": "PostToolUse", "tool_name": tool,
                                                "tool_input": {"file_path": str(path)}})

    def test_session_restores_active_pointer_without_changing_state(self):
        payload = {"hook_event_name": "SessionStart", "source": "startup"}
        result, text = self.hook("session-context.py", payload)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("No active task", text)
        self.assertEqual(list(self.artifacts.iterdir()), [])
        active = self.artifacts / "active-task.json"
        active.write_text('{"task":"status-filter"}')
        original = active.read_bytes()
        for source in ("resume", "clear", "compact"):
            with self.subTest(source=source):
                payload["source"] = source
                result, text = self.hook("session-context.py", payload)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn("docs/tasks/status-filter/prd.md", text)
                self.assertIn("task.py check status-filter", text)
                self.assertNotIn("PASS", text)
                self.assertEqual(active.read_bytes(), original)

    def test_session_reports_missing_node_and_malformed_state(self):
        env = {**os.environ, "PATH": str(self.root / "no-executables")}
        result, text = self.hook("session-context.py", {"hook_event_name": "SessionStart"}, env)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("could not execute node", text)
        (self.artifacts / "active-task.json").write_text('{"task":"../other"}')
        result, text = self.hook("session-context.py", {"hook_event_name": "SessionStart"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("CONTEXT ERROR", text)

    def test_real_lint_reports_error_then_accepts_fix_without_writing(self):
        # A dynamic-route-like name must be a literal filename, not an ESLint glob.
        path = self.root / "src" / "[id]"
        path.mkdir()
        source = path / "example.ts"
        source.write_text("export const value: any = 1;\n")
        original = source.read_bytes()
        result, text = self.edit(source, "Write")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("LINT FAILED", text)
        self.assertIn("no-explicit-any", text)
        self.assertEqual(source.read_bytes(), original)
        source.write_text("export const value: number = 1;\n")
        original = source.read_bytes()
        result, text = self.edit(source)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(text, "", result.stdout)
        self.assertEqual(source.read_bytes(), original)

    def test_lint_configuration_failure_is_not_a_source_violation(self):
        source = self.root / "src/example.ts"
        source.write_text("export const value = 1;\n")
        (self.root / "eslint.config.mjs").write_text('throw new Error("fixture config error");\n')
        result, text = self.edit(source)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("LINT NOT RUN", text)
        self.assertNotIn("LINT FAILED", text)
        self.assertIn("fixture config error", text)

    def test_scope_missing_dependency_and_path_escape_are_explicit(self):
        (self.root / "node_modules").unlink()
        result, text = self.edit("docs/example.md")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(text, "")
        result, text = self.edit(".artifacts/report.ts")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(text, "")
        source = self.root / "src/example.ts"
        source.write_text("export const value = 1;\n")
        result, text = self.edit(source)
        self.assertIn("LINT NOT RUN", text)
        self.assertIn("npm ci", text)
        for value in ("../outside.ts", "src/missing.ts", str(self.root)):
            result, text = self.edit(value)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("LINT NOT RUN", text)
        (self.root / "src/escape.ts").symlink_to(self.root.parent / "outside.ts")
        result, text = self.edit("src/escape.ts")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("outside the project", text)

    def test_malformed_payload_is_visible_for_both_hooks(self):
        for name in ("session-context.py", "lint-changed-file.py"):
            for payload in ("{broken", "[]", "{}"):
                with self.subTest(name=name, payload=payload):
                    result, text = self.hook(name, payload)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertTrue(text, result.stdout)


if __name__ == "__main__":
    unittest.main()
