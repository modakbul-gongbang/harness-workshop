# nextjs-refactor

확정 여부: **확정**, 사용자의 새 브랜치 전환 지시와 Next.js 선택을 반영한다.
두 수강생 실습 ticket과 별개인 기반 전환 작업이다.

## 문제 / 범위

앱 전체를 Next.js App Router와 TypeScript strict 환경으로 전환한다.
기존 실행 스택의 소스·빌드 설정·문서 안내를 제거하고 Node 24, npm lockfile, SQLite 파일 저장으로 통일한다.
기존 Python 하네스, 세 스킬, 독립 verifier, hooks, Playwright MCP와 가이드 체계는 최대한 유지한다.
기본 TODO/소유권/입력/CSRF/파일 저장 계약과 한국어 UI를 보존한다.

## 비범위 / 보존 동작

두 교육 과제의 실제 구현, 공개 배포, push/PR, 전역 도구 설치, 부모 발표 자료 수정은 하지 않는다.
기존 로컬 DB 파일과 Git 이력은 삭제하거나 자동 변환하지 않는다.
새 로그인 폼 제출 경로는 App Router 페이지/Route Handler 분리에 맞춰 /api/auth/login이다.
TODO API 경로·응답과 교육 계정은 유지한다.

## 관련 가이드

`docs/guides/backend.md`, `docs/guides/frontend.md`, `docs/guides/testing.md`, `docs/guides/migration.md`.
마이그레이션 가이드의 두 교육 ticket에 대한 스키마 변경 금지는 이번 기반 전환에는 적용되지 않는다.

## 완료·검증 조건

| ID | 완료 조건 | 검증 조건 |
| --- | --- | --- |
| AC-01 | Node 24 + Next.js + TypeScript로 설치/빌드/실행된다. | npm ci, 공통 verify, 실제 프로덕션 서버 확인. |
| AC-02 | 기본 API/소유권/입력/인증/CSRF 계약을 보존한다. | 실제 HTTP와 임시 SQLite로 BASE-01~07 검사, 현실적 mutation 실패 확인. |
| AC-03 | 파일 DB와 최초 시드가 재기동 후에도 올바르다. | BASE-09 재기동 테스트. |
| AC-04 | 한국어 목록 UI, CRUD, 확인/키보드/모바일/오류 상태를 보존한다. | 실제 브라우저 로그인/생성/편집/완료/되돌리기/삭제, 390px와 긴 한국어 확인. |
| AC-05 | 하네스가 새 경로/생성물에 맞고 역할 및 stale gate가 동작한다. | hook fixture, source/lockfile 변경 stale, node_modules/.next 제외, 독립 검증. |
| AC-06 | 문서/CI/지역 가이드가 새 구조와 일치하며 교육 ticket은 미구현이다. | 소스/diff/문서 검사, 두 PRD와 목록 조회 시작점 확인. |

## 질문

미해결 질문 없음.
선택 세부사항은 Node 24, SQLite 파일 저장, 기존 CSS 토큰 유지다.

## 검증 범위

| Surface | 적용 | 이유 |
| --- | --- | --- |
| tests | required | 공통 검증과 변경·보존 계약의 회귀를 확인한다. |
| api | required | 조회·소유자·HTTP 계약이 변경 또는 리팩터링 대상이다. |
| ui | required | 새 화면 동작 또는 기존 핵심 사용자 흐름의 보존을 확인한다. |
