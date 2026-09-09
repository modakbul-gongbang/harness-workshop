import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { environment, readConfig, runtimeEnvironmentKeys } from "../src/server/config";

test("example and code registry contain exactly the same keys; invalid values fail without disclosure", () => {
  const example = readFileSync(".env.example", "utf8");
  const keys = [...example.matchAll(/^\s*#?\s*([A-Z][A-Z0-9_]*)=/gm)].map(match => match[1]);
  assert.deepEqual(keys.sort(), Object.keys(environment).sort());
  for (const [key, entry] of Object.entries(environment)) {
    assert.equal(entry.scope, "server");
    assert.ok(entry.note.length);
    assert.match(example, new RegExp(`^# ${key}=`, "m"));
  }
  assert.ok(readConfig({}).dataDir.endsWith("/data"));
  assert.throws(() => readConfig({ WORKSHOP_DATA_DIR: " " }), /WORKSHOP_DATA_DIR/);
  const secretValue = "hidden\0path";
  assert.throws(() => readConfig({ WORKSHOP_DATA_DIR: secretValue }), error => {
    assert.ok(error instanceof Error);
    assert.ok(!error.message.includes(secretValue));
    return true;
  });
});

test("app environment access stays in the registry, except enumerated runtime keys", () => {
  function scan(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { scan(path); continue; }
      if (!/\.tsx?$/.test(path) || path === "src/server/config.ts") continue;
      const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
      const property = (node: ts.Node): string | undefined => ts.isPropertyAccessExpression(node) ? node.name.text :
        ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteral(node.argumentExpression) ? node.argumentExpression.text : undefined;
      function visit(node: ts.Node) {
        if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
            ts.isIdentifier(node.expression) && node.expression.text === "process" && property(node) === "env") {
          const key = property(node.parent);
          assert.ok(key && (runtimeEnvironmentKeys as readonly string[]).includes(key), `Unregistered environment access: ${path}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  scan("src");
});
