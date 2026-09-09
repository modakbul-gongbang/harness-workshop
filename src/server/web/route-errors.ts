import { requireOwner } from "../session";
import { apiError, HttpError } from "./errors";

export async function methodNotAllowed() {
  try {
    await requireOwner();
    throw new HttpError(405, "METHOD_NOT_ALLOWED", "지원하지 않는 요청 방식입니다.");
  } catch (error) { return apiError(error); }
}
export async function routeNotFound() {
  try {
    await requireOwner();
    throw new HttpError(404, "NOT_FOUND", "요청 경로를 찾을 수 없습니다.");
  } catch (error) { return apiError(error); }
}
