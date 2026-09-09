export class Unauthenticated extends Error {
  constructor() { super("로그인이 필요합니다."); }
}

export interface Csrf { token: string; headerName: string }
export async function fetchResponse(path: string, options?: RequestInit): Promise<Response> {
  try { return await fetch(path, options); }
  catch { throw new Error("서버에 연결하지 못했습니다. 연결을 확인하고 다시 시도하세요."); }
}
export async function readJson<T>(response: Response): Promise<T> {
  try { return await response.json() as T; }
  catch { throw new Error("서버 응답을 읽지 못했습니다. 새로고침 후 다시 시도하세요."); }
}
export async function getCsrf(): Promise<Csrf> {
  const response = await fetchResponse("/api/csrf");
  if (!response.ok) throw new Error("보안 토큰을 가져오지 못했습니다. 새로고침해 주세요.");
  return readJson<Csrf>(response);
}
export async function api<T>(path: string, csrf: Csrf, options: RequestInit = {}): Promise<T> {
  const response = await fetchResponse(path, { ...options,
    headers: { "Content-Type": "application/json", [csrf.headerName]: csrf.token },
  });
  if (response.status === 401) {
    throw new Unauthenticated();
  }
  if (!response.ok) {
    const body = await readJson<{ message?: string }>(response);
    throw new Error(body.message || "요청을 처리하지 못했습니다.");
  }
  return response.status === 204 ? null as T : readJson<T>(response);
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "처리하지 못했습니다. 다시 시도하세요.";
}
