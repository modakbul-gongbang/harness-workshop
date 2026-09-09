import "server-only";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { readConfig } from "./config";

// Reuse one connection across route modules and development reloads.
const state = globalThis as typeof globalThis & { workshopDatabase?: DatabaseSync };

export function getDatabase(): DatabaseSync {
  if (state.workshopDatabase) return state.workshopDatabase;
  const { dataDir } = readConfig();
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(dataDir, "todos.sqlite"));
  try {
    db.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner TEXT NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL CHECK (completed IN (0, 1))
      );
      CREATE INDEX IF NOT EXISTS idx_todo_owner ON todos(owner);
      CREATE TABLE IF NOT EXISTS workshop_seed (id INTEGER PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, owner TEXT NOT NULL, expires_at INTEGER NOT NULL);
      BEGIN IMMEDIATE;
    `);
    if (!db.prepare("SELECT id FROM workshop_seed WHERE id = 1").get()) {
      const insert = db.prepare("INSERT INTO todos(owner, title, completed) VALUES (?, ?, ?)");
      insert.run("minsu", "실습 README 읽기", 0);
      insert.run("minsu", "로컬 서버 실행하기", 1);
      insert.run("jiyun", "나만의 할 일 작성하기", 0);
      db.prepare("INSERT INTO workshop_seed(id) VALUES (1)").run();
    }
    db.prepare("INSERT OR IGNORE INTO settings(key, value) VALUES ('session_password', ?)")
      .run(randomBytes(48).toString("base64url"));
    db.exec("COMMIT");
    state.workshopDatabase = db;
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function sessionPassword(): string {
  const row = getDatabase().prepare("SELECT value FROM settings WHERE key = 'session_password'").get();
  if (typeof row?.value !== "string" || row.value.length < 32) {
    throw new Error("세션 키 저장 상태가 올바르지 않습니다.");
  }
  return row.value;
}
