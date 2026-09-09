# 구조

Node.js 24 / Next.js 16 App Router / React / TypeScript strict를 사용한다.
정확한 의존성 버전은 package.json과 package-lock.json에 고정한다.
Next 서버 한 개가 한국어 페이지와 JSON API를 함께 제공한다.
외부 API key, DB 서버, 별도 백엔드는 필요하지 않다.

`app Route Handler -> server/web -> server/service -> server/domain -> SQLite`가 기본 흐름이다.
화면은 Server Component에서 세션을 검사하고 Client Component가 목록과 폼 상호작용을 담당한다.
DB와 세션 모듈은 server-only이며 브라우저 번들로 가져올 수 없다.
React 텍스트 노드가 사용자 제목을 이스케이프한다.
기존 CSS 토큰과 읽기 목록, 명시적 행 편집, 삭제 확인 패턴을 유지한다.

## 인증과 API

iron-session이 암호화한 HttpOnly / SameSite=Lax 쿠키를 관리한다.
공개 교육 계정은 minsu/jiyun 두 명이며 세션의 무작위 ID로 SQLite sessions에서 소유자와 만료를 확인한다.
로그인 때 세션 ID와 CSRF 토큰을 교체하고 로그아웃 때 서버 세션도 삭제하므로 이전 쿠키를 재사용할 수 없다.
세션 유효 기간은 1시간이며 로그인 시 만료 행을 정리한다.
쿠키 secure=false와 loopback 서버는 로컬 HTTP 실습 계약이다.
실제 서비스 인증이나 인터넷 배포를 위한 구성이 아니다.

브라우저는 `/api/csrf`에서 토큰을 받아 변경 요청의 `X-CSRF-TOKEN`에 보낸다.
로그인 폼은 POST `/api/auth/login`, 로그아웃은 POST `/logout`에 `_csrf`를 보낸다.
App Router에서 `/login`은 페이지로 유지하고 폼 처리는 별도 Route Handler에 둔다.
토큰은 암호화된 세션에 바인딩하고 바이트 길이를 확인한 뒤 상수 시간 비교한다.

목록 응답은 `{id,title,completed}` 배열, id 내림차순이다.
소유자는 검증된 서버 세션에서만 얻으며 응답에는 포함하지 않는다.
변경은 서비스에서 수행하고 repository의 한 SQL 문으로 소유자 확인과 쓰기를 함께 처리한다.
완료 토글도 목표 상태를 명시하는 PUT이다.
Zod strict object가 미지 필드와 잘못된 형식을 거절한다.

## 의도적인 교육 시작점

`server/web/todo-controller.ts`의 `listTodos`에만 작은 repository 조회와 DTO 변환이 남아 있다.
`extract-list-service`에서 조회를 기존 `todoService` 패턴에 맞춰 옮긴다.
이 한 곳은 계층 분리 원칙의 공개된 실습 예외이며 소유자 필터를 제거하는 예외가 아니다.
단일 SELECT에 불필요한 트랜잭션/인터페이스/새 서비스 체계를 만들지 않는다.
`status-filter`는 아직 구현하지 않았다.

## 저장과 환경

`src/server/config.ts`가 환경 변수의 열거 가능한 단일 레지스트리다.
선택 변수 WORKSHOP_DATA_DIR은 없으면 `./data`를 사용하며, 빈 값이나 잘못된 경로 형식은 기동 전에 실패한다.
키의 필수 여부, 형식, 부재 동작과 서버 전용 범위를 코드에 정의하고 `.env.example`과 쌍방 검사한다.
Next의 NODE_ENV/NEXT_RUNTIME은 코드에 열거한 런타임 예외다.
기본 서버 주소는 loopback:8080이며 포트 변경은 `npm run dev -- --port 8081`로 한다.

`data/todos.sqlite`에 TODO, 최초 시드 표식, 세션, 최초 생성한 무작위 세션 암호화 키가 저장된다.
DB는 실행 시 생성하는 로컬 상태이며 빌드 배포 파일에 포함하지 않는다.
SQLite WAL과 busy timeout을 사용하며 시드와 표식 저장은 하나의 트랜잭션이다.
사용자가 모든 TODO를 삭제해도 재기동 때 시드를 다시 넣지 않는다.
기존 다른 형식의 로컬 파일은 읽거나 삭제하지 않으며 자동 변환하지 않는다.
실제 DB 전환이 필요하면 별도 백업/마이그레이션 계약을 정한다.
Node 내장 node:sqlite를 사용하므로 외부 DB 서버나 네이티브 DB 패키지 설치가 필요하지 않다.

## 하네스 경계

`task.py`는 확정 PRD와 검증 범위, 활성 slug, 입력 fingerprint, 결과 검증과 완료 시 활성 상태 해제를 처리한다.
PRD의 `확정 여부: **확정**`과 tests/api/ui 검증 범위 표를 읽는다.
tests는 required이며 API/UI는 required 또는 이유가 있는 not-applicable이다.
PRD·모든 가이드·source/test·빌드/하네스/문서 파일의 경로와 바이트를 SHA-256에 바인딩한다.
`.git`, `node_modules`, `.next`, `out`, `coverage`, `data`, `.artifacts`, 생성된 타입 선언/빌드 캐시/로컬 설정은 제외하여 결과 저장이 fingerprint를 다시 바꾸지 않는다.
이름이 같은 파일도 위치와 내용이 바뀌면 stale이다.
새 파일/삭제도 포함되며 symlink는 거절한다.

독립 verifier가 snapshot을 먼저 읽고 선언된 검증 범위와 AC/가이드를 직접 검사한 뒤 verification.json/md를 Write로 저장한다.
required 항목은 PASS만 통과하고, not-applicable은 실제 diff와 영향 검토에 근거한 N/A만 통과한다.
실행할 수 없는 required 항목은 BLOCKED다.
gate는 사유 문자열의 존재와 사전 선언을 검사하며 사유의 타당성은 독립 verifier와 사람이 판단한다.
finish는 최신 check가 PASS일 때만 해당 활성 task를 해제하며 다른 활성 task는 보존한다.
완료 보고서는 유지되어 나중에 create-pr가 현재 입력으로 다시 검사할 수 있다.
구현자는 소스 수정 권한을 갖고 보고서 작성 권한은 갖지 않는다.
PreToolUse는 verifier의 Write/Edit를 활성 task의 두 보고서 파일에 제한하고 Bash를 공통 검증/스냅샷/검사 명령에 제한한다.
일반 구현자의 보고서 직접 Write/Edit도 거절한다.
셸이나 훅 자체를 고치면 우회 가능한 교육용 협업 규칙이며 변조 불가능한 보안 경계가 아니다.
신뢰하지 않는 실행자의 격리·서명·원격 승인 시스템으로 주장하지 않는다.

Stop은 활성 task의 명시적 완료 마커에서만 gate한다.
누락/FAIL/BLOCKED/stale을 첫 Stop에서 막고, stop_hook_active 재진입에서는 BLOCKED 상태를 드러내고 종료하여 무한 반복하지 않는다.
마커 없는 일반 대화/문서 작성은 막지 않는다.
기형 payload는 명시적인 hook error이고 PASS가 아니다.
이 협력적 완료 마커를 생략하면 완료 검사를 우회할 수 있으므로 독립 검증 및 사람의 결과 확인도 필요하다.

## 지침과 편집 피드백

루트와 하위 CLAUDE.md는 공통 흐름과 지역 책임을 나누고 `.claude/rules/`는 경로별 작성 컨벤션을 제공한다.
문서별 기준과 유지 책임은 [문서 지도](README.md)를 따른다.
SessionStart는 활성 작업과 Node 환경을 알리고 PostToolUse는 편집한 소스 한 파일에 기존 ESLint를 실행한다.
둘 다 검증 보고서를 작성하거나 작업 완료를 판정하지 않는다.
추가 훅의 적용 경로·실패 알림·검증 방법은 [훅 운영](guides/hooks.md)을 따른다.
