export interface Todo {
  id: number;
  owner: string;
  title: string;
  completed: boolean;
}
export type TodoView = Omit<Todo, "owner">;

export class TodoNotFound extends Error {
  constructor() { super("할 일을 찾을 수 없습니다."); }
}
