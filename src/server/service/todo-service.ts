import "server-only";
import { todoRepository } from "../domain/todo-repository";

export const todoService = {
  create(owner: string, title: string) {
    return todoRepository.create(owner, title.trim());
  },
  update(owner: string, id: number, title: string, completed: boolean) {
    return todoRepository.update(owner, id, title.trim(), completed);
  },
  delete(owner: string, id: number) {
    todoRepository.delete(owner, id);
  },
};
