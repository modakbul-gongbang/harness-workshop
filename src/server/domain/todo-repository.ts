import "server-only";
import { getDatabase } from "../database";
import { TodoNotFound, type Todo } from "./todo";

function fromRow(row: Record<string, unknown>): Todo {
  return { id: Number(row.id), owner: String(row.owner), title: String(row.title), completed: row.completed === 1 };
}

export const todoRepository = {
  findByOwnerOrderByIdDesc(owner: string): Todo[] {
    return getDatabase().prepare("SELECT * FROM todos WHERE owner = ? ORDER BY id DESC").all(owner).map(fromRow);
  },
  create(owner: string, title: string): Todo {
    const row = getDatabase().prepare("INSERT INTO todos(owner, title, completed) VALUES (?, ?, 0) RETURNING *").get(owner, title);
    if (!row) throw new Error("할 일을 저장하지 못했습니다.");
    return fromRow(row);
  },
  update(owner: string, id: number, title: string, completed: boolean): Todo {
    const row = getDatabase().prepare("UPDATE todos SET title = ?, completed = ? WHERE id = ? AND owner = ? RETURNING *")
      .get(title, Number(completed), id, owner);
    if (!row) throw new TodoNotFound();
    return fromRow(row);
  },
  delete(owner: string, id: number): void {
    const result = getDatabase().prepare("DELETE FROM todos WHERE id = ? AND owner = ?").run(id, owner);
    if (!result.changes) throw new TodoNotFound();
  },
};
