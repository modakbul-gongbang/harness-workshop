import { updateTodo, deleteTodo } from "@/server/web/todo-controller";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  return updateTodo(request, (await context.params).id);
}
export async function DELETE(request: Request, context: Context) {
  return deleteTodo(request, (await context.params).id);
}
export { methodNotAllowed as GET, methodNotAllowed as POST, methodNotAllowed as PATCH } from "@/server/web/route-errors";
