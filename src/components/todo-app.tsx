"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TodoView } from "@/server/domain/todo";
import { api, errorMessage, getCsrf, Unauthenticated, type Csrf } from "./api";

type Notice = { text: string; error: boolean };
type Update = (todo: TodoView, title: string, completed: boolean) => Promise<boolean>;

function TodoRow({ todo, pending, update, remove }: {
  todo: TodoView; pending: boolean; update: Update; remove: (todo: TodoView) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const editButton = useRef<HTMLButtonElement>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  function close() {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  }
  return <li className={`todo-row${todo.completed ? " completed" : ""}`} data-id={todo.id}>
    {editing ? <form className="edit-form" onKeyDown={event => {
      if (event.key === "Escape" && !pending) { event.preventDefault(); close(); }
    }} onSubmit={async event => {
      event.preventDefault();
      if (await update(todo, title, todo.completed)) close();
    }}>
      <label htmlFor={`edit-${todo.id}`}>제목 수정</label>
      <input id={`edit-${todo.id}`} value={title} onChange={event => setTitle(event.target.value)} maxLength={120} required autoFocus disabled={pending} />
      <button type="submit" disabled={pending}>저장</button><button type="button" onClick={close} disabled={pending}>취소</button>
    </form> : <>
      <div className="todo-content"><p className="todo-title">{todo.title}</p><span className="state">{todo.completed ? "완료" : "미완료"}</span></div>
      <div className="actions">
        <button ref={toggleButton} type="button" disabled={pending} aria-label={`${todo.title} ${todo.completed ? "되돌리기" : "완료하기"}`} onClick={async () => {
          await update(todo, todo.title, !todo.completed);
          requestAnimationFrame(() => toggleButton.current?.focus());
        }}>{todo.completed ? "되돌리기" : "완료하기"}</button>
        <button ref={editButton} type="button" disabled={pending} aria-label={`${todo.title} 수정`} onClick={() => { setTitle(todo.title); setEditing(true); }}>수정</button>
        <button type="button" disabled={pending} aria-label={`${todo.title} 삭제`} onClick={() => remove(todo)}>삭제</button>
      </div>
    </>}
  </li>;
}

function DeleteDialog({ todo, cancel, confirm }: { todo: TodoView; cancel: () => void; confirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} id="delete-dialog" aria-labelledby="delete-heading" onCancel={cancel} onClose={cancel}>
    <h2 id="delete-heading">할 일을 삭제할까요?</h2><p id="delete-title">{todo.title}</p>
    <p className="muted">삭제하면 되돌릴 수 없습니다.</p>
    <div className="actions"><button id="cancel-delete" type="button" autoFocus onClick={cancel}>유지하기</button><button id="confirm-delete" type="button" className="danger" onClick={confirm}>삭제하기</button></div>
  </dialog>;
}

export default function TodoApp({ username }: { username: string }) {
  const router = useRouter();
  const [todos, setTodos] = useState<TodoView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [notice, setNotice] = useState<Notice>({ text: "", error: false });
  const [deletion, setDeletion] = useState<TodoView | null>(null);
  const csrf = useRef<Csrf | null>(null);
  const newTitle = useRef<HTMLInputElement>(null);
  const deletionTrigger = useRef<HTMLElement | null>(null);

  const request = useCallback(async <T,>(path: string, options?: RequestInit): Promise<T> => {
    csrf.current ??= await getCsrf();
    try { return await api<T>(path, csrf.current, options); }
    catch (error) {
      if (error instanceof Unauthenticated) router.replace("/login");
      throw error;
    }
  }, [router]);
  const load = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try { setTodos(await request<TodoView[]>("/api/todos")); return true; }
    catch (error) {
      setLoadError(true); setNotice({ text: errorMessage(error), error: true });
      return false;
    } finally { setLoading(false); }
  }, [request]);
  useEffect(() => {
    let cancelled = false;
    request<TodoView[]>("/api/todos").then(rows => {
      if (!cancelled) setTodos(rows);
    }).catch(error => {
      if (!cancelled) { setLoadError(true); setNotice({ text: errorMessage(error), error: true }); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [request]);

  async function perform(operation: () => Promise<unknown>, success: string): Promise<boolean> {
    setPending(true);
    try {
      await operation();
      setNotice({ text: success, error: false });
      await load();
      return true;
    } catch (error) { setNotice({ text: errorMessage(error), error: true }); return false; }
    finally { setPending(false); }
  }
  const update: Update = async (todo, title, completed) => {
    if (!title.trim()) { setNotice({ text: "제목을 입력하세요.", error: true }); return false; }
    const success = todo.completed !== completed
      ? (completed ? "할 일을 완료했습니다." : "미완료로 되돌렸습니다.") : "할 일을 수정했습니다.";
    return perform(() => request(`/api/todos/${todo.id}`, { method: "PUT", body: JSON.stringify({ title, completed }) }), success);
  };
  function cancelDeletion() {
    setDeletion(null);
    requestAnimationFrame(() => deletionTrigger.current?.focus());
  }

  return <main className="shell">
    <header><div><p className="eyebrow">TODO WORKSHOP</p><h1>오늘 할 일</h1></div>
      <div className="account"><span><strong>{username}</strong> 님</span>
        <form action="/logout" method="post" onSubmit={async event => {
          event.preventDefault();
          const form = event.currentTarget;
          setPending(true);
          try {
            const token = await getCsrf();
            (form.elements.namedItem("_csrf") as HTMLInputElement).value = token.token;
            form.submit();
          } catch (error) { setNotice({ text: errorMessage(error), error: true }); setPending(false); }
        }}><input name="_csrf" type="hidden" /><button type="submit" disabled={pending}>로그아웃</button></form>
      </div>
    </header>
    <p className="muted">작게 적고, 하나씩 마쳐 보세요.</p>
    <form id="create-form" className="create-form" onSubmit={async event => {
      event.preventDefault();
      if (!title.trim()) { setNotice({ text: "제목을 입력하세요.", error: true }); newTitle.current?.focus(); return; }
      await perform(async () => {
        await request("/api/todos", { method: "POST", body: JSON.stringify({ title }) });
        setTitle("");
      }, "할 일을 추가했습니다.");
      requestAnimationFrame(() => newTitle.current?.focus());
    }}>
      <label htmlFor="new-title">새 할 일</label><div className="input-row">
        <input ref={newTitle} id="new-title" name="title" maxLength={120} required placeholder="무엇을 할까요?" autoComplete="off" value={title} onChange={event => setTitle(event.target.value)} disabled={pending} />
        <button className="primary" type="submit" disabled={pending || loading}>추가</button>
      </div><small className="muted">1~120자</small>
    </form>
    <p id="message" role={notice.error ? "alert" : "status"} aria-live="polite" className={notice.error ? "error" : ""}>{notice.text}</p>
    <div className="list-heading"><h2>내 목록</h2><span id="count" className="muted">{!loading && !loadError && `${todos.length}개 · 완료 ${todos.filter(todo => todo.completed).length}개`}</span></div>
    {loading && <p id="loading" role="status">목록을 불러오는 중입니다.</p>}
    {loadError && <div id="load-error"><p className="error" role="alert">목록을 불러오지 못했습니다.</p><button id="retry" type="button" onClick={() => { setNotice({ text: "", error: false }); void load(); }}>다시 시도</button></div>}
    {!loading && !loadError && todos.length === 0 && <p id="empty" className="empty">아직 할 일이 없어요.<br /><span className="muted">위에서 첫 할 일을 추가해 보세요.</span></p>}
    <ul id="todos" aria-label="내 할 일" aria-busy={loading}>{!loadError && todos.map(todo => <TodoRow key={todo.id} todo={todo} pending={pending || loading} update={update} remove={todo => {
      deletionTrigger.current = document.activeElement as HTMLElement;
      setDeletion(todo);
    }} />)}</ul>
    <footer>교육용 계정 · 내 계정의 할 일만 표시됩니다.</footer>
    {deletion && <DeleteDialog todo={deletion} cancel={cancelDeletion} confirm={async () => {
      const todo = deletion;
      setDeletion(null);
      await perform(() => request(`/api/todos/${todo.id}`, { method: "DELETE" }), "할 일을 삭제했습니다.");
      requestAnimationFrame(() => newTitle.current?.focus());
    }} />}
  </main>;
}
