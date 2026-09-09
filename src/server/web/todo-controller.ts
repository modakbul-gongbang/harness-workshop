import { z } from "zod";
import { todoRepository } from "../domain/todo-repository";
import type { Todo, TodoView } from "../domain/todo";
import { todoService } from "../service/todo-service";
import { requireCsrf, requireOwner } from "../session";
import { apiError, HttpError, invalidInput } from "./errors";

const title = z.string().max(120).refine(value => value.trim().length > 0);
const createInput = z.strictObject({ title });
const updateInput = z.strictObject({ title, completed: z.boolean() });
const view = ({ id, title, completed }: Todo): TodoView => ({ id, title, completed });

async function body(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "JSON 형식으로 요청하세요.");
  }
  try { return await request.json(); } catch { throw invalidInput(); }
}
function todoId(value: string): number {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw invalidInput();
  return Number(value);
}
export async function listTodos(): Promise<Response> {
  try {
    const owner = await requireOwner();
    // Intentional workshop starting point: extract-list-service moves only this query.
    return Response.json(todoRepository.findByOwnerOrderByIdDesc(owner).map(view));
  } catch (error) { return apiError(error); }
}
export async function createTodo(request: Request): Promise<Response> {
  try {
    const owner = await requireOwner();
    await requireCsrf(request.headers.get("X-CSRF-TOKEN"));
    const result = createInput.safeParse(await body(request));
    if (!result.success) throw invalidInput();
    return Response.json(view(todoService.create(owner, result.data.title)), { status: 201 });
  } catch (error) { return apiError(error); }
}
export async function updateTodo(request: Request, id: string): Promise<Response> {
  try {
    const owner = await requireOwner();
    await requireCsrf(request.headers.get("X-CSRF-TOKEN"));
    const result = updateInput.safeParse(await body(request));
    if (!result.success) throw invalidInput();
    return Response.json(view(todoService.update(owner, todoId(id), result.data.title, result.data.completed)));
  } catch (error) { return apiError(error); }
}
export async function deleteTodo(request: Request, id: string): Promise<Response> {
  try {
    const owner = await requireOwner();
    await requireCsrf(request.headers.get("X-CSRF-TOKEN"));
    todoService.delete(owner, todoId(id));
    return new Response(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
