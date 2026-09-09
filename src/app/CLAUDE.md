# 페이지와 요청 진입점

`page.tsx`와 `login/page.tsx`는 Server Component다.
로그인 여부를 서버에서 확인하고 브라우저 상호작용은 `src/components/`에 맡긴다.

## 수정 경계

- Route Handler는 HTTP 진입점과 메서드 연결을 담당한다.
  TODO 입력 검증·응답 변환은 `server/web`, 변경 정책은 `server/service`, SQL은 `server/domain`에 둔다.
- 동적 Route Handler의 `params`와 페이지의 `searchParams`는 현재 Next 타입에 맞춰 await한다.
  API 변경 전 설치된 Next 문서와 기존 시그니처를 확인한다.
- `/login`은 페이지, `/api/auth/login`은 로그인 폼 처리다.
  세션·CSRF 흐름은 `server/session.ts`를 사용한다.
- 미지원 메서드와 미등록 API 경로도 기존 오류 계약을 유지한다.
  정상 GET/POST만 확인하고 끝내지 않는다.
- SQLite와 세션은 Node 서버에서 실행한다.
  서버 모듈을 Client Component에 import하거나 Edge로 전환하지 않는다.
- `globals.css`가 공통 화면 토큰의 기준이다.
  디자인 값을 컴포넌트마다 새로 만들지 않는다.

페이지 수정 전 [화면 가이드](../../docs/guides/frontend.md), API·logout 수정 전 [백엔드 가이드](../../docs/guides/backend.md)를 읽는다.
HTTP 동작은 `tests/api.test.ts`, 화면 상호작용은 실제 브라우저에서 확인한다.
