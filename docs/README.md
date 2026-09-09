# 문서 지도

## 작업별 읽는 순서

| 할 일 | 기준 문서 |
| --- | --- |
| 설치·실행·실습 시작 | [프로젝트 README](../README.md) |
| 기존 동작과 정답 확인 | [기본 계약](baseline-contract.md), [용어집](glossary.md) |
| 호출 경로·저장·인증 이해 | [아키텍처](architecture.md) |
| API·정책·권한 변경 | [백엔드](guides/backend.md) |
| 화면·폼·키보드 변경 | [화면](guides/frontend.md) |
| 테스트 설계·독립 검증 | [검증](guides/testing.md) |
| 환경·DB·시드 변경 | [마이그레이션](guides/migration.md) |
| 훅 추가·오류 진단 | [훅 운영](guides/hooks.md) |
| 요구사항과 구현 계획 작성 | [PRD 템플릿](../.claude/skills/write-prd/references/prd-template.md), [계획 템플릿](../.claude/skills/implement-prd/references/plan-template.md) |

## 지침을 어디에 둘까

| 위치 | 담을 내용 | 넣지 않을 내용 |
| --- | --- | --- |
| 루트 `CLAUDE.md` | 공통 명령·프로젝트 지도·작업 흐름·핵심 금지 | 모든 라이브러리 사용법과 지난 작업 로그 |
| 하위 `CLAUDE.md` | 모듈 책임·의존 방향·위험한 수정 경계·검증 위치 | 상위 가이드 전체 복사 |
| `.claude/rules/*.md` | 경로/확장자를 가로지르는 짧은 컨벤션 | 개별 작업의 제품 정책 |
| `docs/guides/` | 사람이 읽고 verifier가 판정할 상세 기준 | 과거 PASS 보고서 |
| `docs/tasks/<slug>/prd.md` | 사용자와 확정한 변경 범위·AC·검증 범위 | 구현 코드에서 복사한 정답 |
| `.artifacts/<slug>/` | 인터뷰·계획·실행 로그·검증·화면 증거 | 영구 프로젝트 규칙 |

루트는 짧은 탐색 지도이며 하위 지침은 관련 파일을 읽을 때 적용된다.
Rules는 YAML frontmatter의 `paths`에 프로젝트 루트 기준 glob을 적어 적용 대상을 한정한다.
이 프로젝트는 TypeScript, React, 테스트, 문서의 네 파일로 시작한다.
경로·확장자가 바뀌면 Rules의 매칭도 함께 확인한다.
자동 로딩 범위는 [공식 메모리 문서](https://code.claude.com/docs/en/memory)를 따른다.
독립 verifier에게도 현재 diff에 해당하는 Rules를 명시적으로 읽도록 전달한다.

## 유지 기준

CLAUDE.md는 파일마다 200줄 이내를 목표로 하고 긴 근거는 가이드로 옮긴다.
일반적인 문법 설명보다 이 프로젝트에서 실수하기 쉬운 경계와 실제 명령을 남긴다.
구조를 바꾸면 아키텍처와 관련 하위 CLAUDE.md를, 명령을 바꾸면 README와 실행 안내를 함께 갱신한다.
문서의 상대 링크가 존재하는지, 코드·테스트·설명 사이에 충돌이 없는지 확인한다.
지침은 모델의 작업 기준이며 기계적 검사는 ESLint·테스트·훅이 담당한다.
구체적인 강제 범위와 한계는 각 도구의 현재 설정으로 확인한다.
