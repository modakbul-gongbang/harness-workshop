/** Expectations: docs/baseline-contract.md. Real production HTTP, cookies and disposable SQLite. */
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import type { TodoView } from "../src/server/domain/todo";

const directory = mkdtempSync(join(tmpdir(), "todo-workshop-test-"));
let server: ChildProcess | undefined;
let origin: string;
let output = "";
async function start() {
  const probe = createServer();
  await new Promise<void>(resolve => probe.listen(0, "127.0.0.1", resolve));
  const address = probe.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  origin = `http://127.0.0.1:${port}`;
  output = "";
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, WORKSHOP_DATA_DIR: directory }, stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout?.on("data", chunk => { output += chunk.toString(); });
  server.stderr?.on("data", chunk => { output += chunk.toString(); });
  for (let attempt = 0; attempt < 200; attempt++) {
    if (server.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try { if ((await fetch(`${origin}/login`)).ok) return; } catch { /* Bounded startup readiness probe. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server startup timed out: ${output}`);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const processToStop = server;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { processToStop.kill("SIGKILL"); reject(new Error("Test server failed to stop")); }, 5000);
    processToStop.once("exit", () => { clearTimeout(timeout); resolve(); });
    processToStop.kill("SIGTERM");
  });
}
class Browser {
  cookie = "";
  async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${origin}${path}`, { ...init, redirect: "manual", headers: { ...init.headers, Cookie: this.cookie } });
    const cookie = response.headers.getSetCookie().find(value => value.startsWith("workshop-session="));
    if (cookie) this.cookie = cookie.split(";")[0];
    return response;
  }
  async token() { return (await this.request("/api/csrf")).json() as Promise<{ token: string; headerName: string }>; }
  async login(username = "minsu", password = "workshop123!") {
    const csrf = await this.token();
    return this.request("/api/auth/login", { method: "POST", body: new URLSearchParams({ username, password, _csrf: csrf.token }) });
  }
  async mutation(method: string, path: string, body?: unknown) {
    const csrf = await this.token();
    return this.request(path, { method, headers: { [csrf.headerName]: csrf.token, ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  async list(): Promise<TodoView[]> { const response = await this.request("/api/todos"); assert.equal(response.status, 200); return response.json(); }
  async create(title: string): Promise<TodoView> {
    const response = await this.mutation("POST", "/api/todos", { title });
    assert.equal(response.status, 201, await response.clone().text());
    return response.json();
  }
}
async function login(username = "minsu") { const client = new Browser(); assert.equal((await client.login(username)).status, 302); return client; }

before(start);
after(async () => { try { await stop(); } finally { rmSync(directory, { recursive: true, force: true }); } });
beforeEach(async () => {
  for (const username of ["minsu", "jiyun"]) {
    const client = await login(username);
    for (const todo of await client.list()) assert.equal((await client.mutation("DELETE", `/api/todos/${todo.id}`)).status, 204);
  }
});

test("BASE-01/07: authentication, CSRF, session rotation, logout and replay rejection", async () => {
  const anonymous = new Browser();
  assert.equal((await anonymous.request("/api/todos")).status, 401);
  assert.equal((await anonymous.login("minsu", "wrong")).headers.get("location"), "/login?error");
  const preLoginToken = await anonymous.token();
  const preLoginCookie = anonymous.cookie;
  assert.equal((await anonymous.login()).headers.get("location"), "/");
  assert.notEqual(anonymous.cookie, preLoginCookie);
  for (const token of [undefined, preLoginToken.token, "é".repeat(43)]) {
    const response = await anonymous.request("/api/todos", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { "X-CSRF-TOKEN": token } : {}) }, body: JSON.stringify({ title: "차단" }) });
    assert.equal(response.status, 403); assert.equal((await response.json()).code, "FORBIDDEN");
  }
  for (const [method, path, status, code] of [["GET", "/api/missing", 404, "NOT_FOUND"], ["PATCH", "/api/todos", 405, "METHOD_NOT_ALLOWED"]] as const) {
    const response = await anonymous.request(path, { method });
    assert.equal(response.status, status); assert.equal((await response.json()).code, code);
  }
  const currentToken = await anonymous.token();
  const wrongMedia = await anonymous.request("/api/todos", { method: "POST", headers: { [currentToken.headerName]: currentToken.token }, body: "not JSON" });
  assert.equal(wrongMedia.status, 415); assert.equal((await wrongMedia.json()).code, "UNSUPPORTED_MEDIA_TYPE");
  const stolenCookie = anonymous.cookie;
  assert.equal((await anonymous.mutation("POST", "/logout")).status, 302);
  assert.equal((await anonymous.request("/api/todos")).status, 401);
  anonymous.cookie = stolenCookie;
  assert.equal((await anonymous.request("/api/todos")).status, 401);
});

test("BASE-03/04/05: CRUD preserves shape, trim and both completion transitions", async () => {
  const client = await login();
  const created = await client.create("  한글 할 일  ");
  assert.deepEqual(created, { id: created.id, title: "한글 할 일", completed: false });
  const path = `/api/todos/${created.id}`;
  for (const completed of [true, false]) {
    const response = await client.mutation("PUT", path, { title: "수정한 제목", completed });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: created.id, title: "수정한 제목", completed });
    assert.deepEqual(await client.list(), [{ id: created.id, title: "수정한 제목", completed }]);
  }
  assert.equal((await client.mutation("DELETE", path)).status, 204);
  assert.deepEqual(await client.list(), []);
});

test("BASE-02: lists isolate owners and sort descending", async () => {
  const minsu = await login(); const jiyun = await login("jiyun");
  const first = await minsu.create("첫 번째");
  const foreign = await jiyun.create("다른 사용자 비공개");
  const second = await minsu.create("두 번째");
  assert.deepEqual(await minsu.list(), [second, first]);
  assert.deepEqual(await jiyun.list(), [foreign]);
});

test("BASE-05: foreign and absent IDs return indistinguishable 404 and never mutate", async () => {
  const minsu = await login(); const jiyun = await login("jiyun");
  const original = await minsu.create("보호 대상");
  for (const method of ["PUT", "DELETE"]) {
    const body = method === "PUT" ? { title: "침범", completed: true } : undefined;
    const foreign = await jiyun.mutation(method, `/api/todos/${original.id}`, body);
    const missing = await jiyun.mutation(method, "/api/todos/999999", body);
    assert.equal(foreign.status, 404); assert.equal(missing.status, 404);
    assert.deepEqual(await foreign.json(), await missing.json());
  }
  assert.deepEqual(await minsu.list(), [original]);
  assert.deepEqual(await jiyun.list(), []);
});

test("BASE-06: 0/1/120/121 title boundaries, malformed JSON, strict fields, boolean and ID", async () => {
  const client = await login();
  for (const title of [null, "", " ", "\t\n", "가".repeat(121), 123]) {
    const response = await client.mutation("POST", "/api/todos", { title });
    assert.equal(response.status, 400); assert.equal((await response.json()).code, "INVALID_INPUT");
  }
  for (const body of [{}, { title: "침범", owner: "jiyun" }, []]) {
    assert.equal((await client.mutation("POST", "/api/todos", body)).status, 400);
  }
  const csrf = await client.token();
  assert.equal((await client.request("/api/todos", { method: "POST", headers: { "Content-Type": "application/json", [csrf.headerName]: csrf.token }, body: "broken" })).status, 400);
  await client.create("가"); const item = await client.create("가".repeat(120));
  for (const body of [{ title: "제목" }, { title: "제목", completed: null }, { title: "제목", completed: "false" }, { title: " ", completed: false }, { title: "제목", completed: false, owner: "jiyun" }]) {
    assert.equal((await client.mutation("PUT", `/api/todos/${item.id}`, body)).status, 400);
  }
  for (const id of ["not-a-number", "0", "1.5", "9007199254740992"]) {
    assert.equal((await client.mutation("DELETE", `/api/todos/${id}`)).status, 400);
  }
  assert.equal((await client.list()).length, 2);
});

test("BASE-08: Korean page uses session identity and title markup remains plain data", async () => {
  const client = await login();
  const page = await client.request("/");
  assert.equal(page.status, 200);
  const html = await page.text();
  for (const text of ['lang="ko"', "오늘 할 일", "minsu", "_csrf"]) assert.ok(html.includes(text));
  const title = "<script>alert('한글')</script>";
  assert.equal((await client.create(title)).title, title);
});

test("BASE-09: file DB survives restart; deleted seeds never reappear", async () => {
  const client = await login("jiyun");
  const original = await client.create("재기동 후에도 유지");
  await stop(); await start();
  assert.deepEqual(await (await login("minsu")).list(), []);
  assert.deepEqual(await (await login("jiyun")).list(), [original]);
});
