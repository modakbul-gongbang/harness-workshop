import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { getDatabase, sessionPassword } from "./database";
import { HttpError } from "./web/errors";

type SessionData = { id?: string; csrf?: string };
const ttl = 60 * 60;

export function readSession() {
  return cookies().then(store => getIronSession<SessionData>(store, {
    password: sessionPassword(), cookieName: "workshop-session", ttl,
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: false, path: "/" },
  }));
}
export async function currentOwner(): Promise<string | null> {
  const session = await readSession();
  if (!session.id) return null;
  const row = getDatabase().prepare("SELECT owner FROM sessions WHERE id = ? AND expires_at > ?")
    .get(session.id, Date.now());
  return typeof row?.owner === "string" ? row.owner : null;
}
export async function requireOwner(): Promise<string> {
  const owner = await currentOwner();
  if (!owner) throw new HttpError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  return owner;
}
export async function csrfToken(): Promise<string> {
  const session = await readSession();
  if (!session.csrf) {
    session.csrf = randomBytes(32).toString("base64url");
    await session.save();
  }
  return session.csrf;
}
export async function requireCsrf(token: unknown): Promise<void> {
  const session = await readSession();
  if (typeof token !== "string" || !session.csrf || Buffer.byteLength(token) !== Buffer.byteLength(session.csrf) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(session.csrf))) {
    throw new HttpError(403, "FORBIDDEN", "요청 권한 또는 보안 토큰을 확인하세요.");
  }
}
export async function signIn(username: unknown, password: unknown): Promise<boolean> {
  // Public local training accounts, not a registration or production identity service.
  if ((username !== "minsu" && username !== "jiyun") || password !== "workshop123!") return false;
  const session = await readSession();
  const db = getDatabase();
  if (session.id) db.prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  session.id = randomBytes(32).toString("base64url");
  session.csrf = randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO sessions(id, owner, expires_at) VALUES (?, ?, ?)").run(session.id, username, Date.now() + ttl * 1000);
  await session.save();
  return true;
}
export async function signOut(): Promise<void> {
  const session = await readSession();
  if (session.id) getDatabase().prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
  session.destroy();
}
