# 오늘 할 일 실습

이 폴더가 독립 프로젝트 루트다.
Node.js 24 / Next.js App Router / React / TypeScript strict / SQLite를 사용하는 Claude Code용 starter다.
전역 설정이나 다른 런타임 설치는 하지 않는다.

## 실행과 검증

프로젝트 루트에서 실행하고 `node --version`이 v24인지 먼저 확인한다.

| 목적 | 명령 |
| --- | --- |
| 의존성 설치 | `npm ci` |
| 개발 서버, http://127.0.0.1:8080 | `npm run dev` |
| 정적 검사 | `npm run lint`, `npm run typecheck` |
| HTTP 통합 테스트 | `npm run build` 후 `npm test` |
| 공통 완료 검증 | `./scripts/verify.sh` |

기존 서버와 사용자 `data/`를 보존한다.
검증 서버는 별도 포트와 임시 DB를 사용한다.

## 코드 지도와 읽을 문서

| 수정 위치 | 역할 | 먼저 읽을 가이드 |
| --- | --- | --- |
| `src/app/` | 페이지와 Route Handler 진입점 | 페이지는 [화면](docs/guides/frontend.md), API·logout은 [백엔드](docs/guides/backend.md) |
| `src/components/` | 브라우저 상호작용과 API 호출 | [화면](docs/guides/frontend.md) |
| `src/server/` | 설정·세션·web/service/domain·SQLite | [백엔드](docs/guides/backend.md) |
| DB·설정·기동 코드 | 영속 데이터와 환경 계약 | [마이그레이션](docs/guides/migration.md) |
| `tests/`, `scripts/`, `.claude/hooks/` | 통합 테스트와 작업 검증 | [검증](docs/guides/testing.md), 훅 변경은 [훅 운영](docs/guides/hooks.md) |

기본 동작의 정답은 [기본 계약](docs/baseline-contract.md), 구조와 실습 예외는 [아키텍처](docs/architecture.md)다.
해당 경로의 하위 CLAUDE.md와 `.claude/rules/`도 함께 적용한다.
문서의 위치와 유지 기준은 [문서 지도](docs/README.md), 용어는 [용어집](docs/glossary.md)을 본다.

## 작업 흐름

- `/deep-interview` → `/write-prd` → `/implement-prd` → 독립 `verifier` → `/create-pr` 순서다.
  명확한 요청은 인터뷰를 생략하고 이미 요청받은 다음 단계까지 이어간다.
- PRD는 `docs/tasks/<slug>/prd.md`에 둔다.
  미확정 제품 정책은 질문하고, 사용자 답변과 기본 계약에서 AC의 기대값을 정한다.
- 구현 시작 시 현재 코드를 직접 조사한다.
  계획·인터뷰·로그·검증 보고서·화면 증거는 Git 제외 `.artifacts/<slug>/`에 둔다.
- 구현자는 verification.json/md를 쓰거나 PASS를 조작하지 않는다.
  새 컨텍스트 verifier가 PRD·가이드·적용 Rules·현재 diff를 읽고 직접 검증 보고서를 작성한다.
- tests는 required이며 API/UI 비적용은 PRD의 범위 선언과 verifier의 diff 검토가 필요하다.
  실행하지 못한 required 항목은 BLOCKED다.
- 테스트는 중요한 정책·경계·회귀를 최소한으로 보호한다.
  버그 수정은 같은 기대값의 수정 전 FAIL과 수정 후 PASS를 기록하고 기존 테스트를 재사용한다.
- 완료 선언은 `[TASK_COMPLETE:<slug>]`, 막혔을 때는 이유와 `[TASK_BLOCKED:<slug>]`를 쓴다.
  `python3 scripts/task.py finish <slug>`로 최신 검증을 확인하고 해당 활성 상태를 정리한다.
  미완료 전환은 사용자 지시에 따라 `python3 scripts/task.py deactivate`로 처리하며 완료로 기록하지 않는다.
  일반 대화·문서 작성은 완료 선언이 아니다.

## 실습 경계

- `status-filter`와 `extract-list-service`는 해당 PRD 작업에서만 구현한다.
  목록 controller의 repository 직접 호출은 공개된 실습 예외다.
- 소유자는 서버 세션에서만 얻고 모든 DB 조회·변경에 소유자 조건을 유지한다.
- 저장 데이터·시드·교육 계정 변경이나 실제 서비스 인증·배포 전환은 별도 범위로 다룬다.
- 아래 Next.js 자동 생성 블록은 수동으로 수정하지 않는다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
