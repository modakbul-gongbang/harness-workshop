import { randomUUID } from "node:crypto";
import { TodoNotFound } from "../domain/todo";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const invalidInput = () => new HttpError(400, "INVALID_INPUT", "입력 형식을 확인하세요. 제목은 공백만으로 작성할 수 없으며 최대 120자입니다.");

export function apiError(error: unknown): Response {
  if (error instanceof TodoNotFound) error = new HttpError(404, "NOT_FOUND", error.message);
  if (error instanceof HttpError) {
    return Response.json({ code: error.code, message: error.message }, { status: error.status });
  }
  const requestId = randomUUID();
  // Failure is delivered to the caller. Never log body, credentials, cookies, or SQL.
  console.error(JSON.stringify({ event: "api.unexpected", requestId, subject: "todo-workshop", type: error instanceof Error ? error.name : "Unknown" }));
  return Response.json({ code: "INTERNAL_ERROR", message: "처리하지 못했습니다. 잠시 후 다시 시도하세요." },
    { status: 500, headers: { "X-Request-Id": requestId } });
}
