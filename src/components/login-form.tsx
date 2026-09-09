"use client";
import { useState } from "react";
import { errorMessage, getCsrf } from "./api";

export default function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <form action="/api/auth/login" method="post" className="login-form" onSubmit={async event => {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true); setError("");
    try {
      const csrf = await getCsrf();
      const input = form.elements.namedItem("_csrf") as HTMLInputElement;
      input.value = csrf.token;
      form.submit();
    } catch (error) { setError(errorMessage(error)); setPending(false); }
  }}>
    <input name="_csrf" type="hidden" />
    <label htmlFor="username">아이디</label><input id="username" name="username" autoComplete="username" required autoFocus />
    <label htmlFor="password">비밀번호</label><input id="password" name="password" type="password" autoComplete="current-password" required />
    {error && <p role="alert" className="error">{error}</p>}
    <button className="primary" type="submit" disabled={pending}>{pending ? "로그인 중…" : "로그인"}</button>
  </form>;
}
