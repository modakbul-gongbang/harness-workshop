# workflow-quality

확정 여부: **확정**, 사용자의 인터뷰·PRD·테스트·독립 검증·PR 흐름 개선 요청을 반영한다.

## 문제 / 범위

질문에서 확정 PRD, 구현, 독립 검증, PR 게시까지의 인계가 불완전하다.
프로젝트 전용 deep-interview를 추가하고 네 스킬의 산출물과 실행 준비·종료 절차를 연결한다.
강의의 기대 결과 검토, 버그 수정 전후 회귀 증거, 테스트 역할·비용·격리 원칙을 PRD 템플릿과 검증 가이드에 반영한다.
검증 범위는 PRD에 미리 선언하고 gate가 누락·부당한 N/A·stale·미확정 실행을 거절하게 한다.

## 비범위 / 보존 동작

TODO 기능, DB, CSS, 두 교육 ticket 구현, 전역 설치, 별도 harness 저장소와 강의 슬라이드 수정은 제외한다.
이번 요청은 로컬 개선과 커밋까지이며 원격 게시를 수행하지 않는다.
기존 Python 하네스와 프로젝트 verifier 소유 보고서, 스냅샷 바인딩, 테스트 공통 명령을 유지한다.

## 결정 근거 / 질문

사용자가 앞선 인터뷰·전달 절차 보완과 강의 테스트 기준 반영을 요청했다.
구현 세부사항은 기존 Python gate를 확장하고 외부 CLI 의존 없는 프로젝트 스킬로 작성한다.
미해결 질문 없음.

## 관련 가이드

`docs/guides/backend.md`, `docs/guides/frontend.md`, `docs/guides/testing.md`, `docs/guides/migration.md`.

## 완료·검증 조건

| ID | 완료 조건 | 검증 조건 |
| --- | --- | --- |
| AC-01 | 인터뷰는 한 질문씩 결정·미해결 사항을 기록하고 write-prd로 인계한다. | 독립 검토자가 모호한 요청·모르겠다는 답·재개 상황을 시뮬레이션하고 누락된 도구 의존과 임의 제품 확정이 없는지 확인. |
| AC-02 | PRD는 구현과 독립된 기대 결과·실패/경계·보존 동작·검증 범위를 담고 사용자 답에 따라 확정된다. | 템플릿과 두 실습 PRD 대조, 초안 activation이 실패하는 실제 CLI fixture. |
| AC-03 | 구현·verifier·PR 스킬이 브랜치, 실행 환경, diff, 실패 수정, 게시 요청 및 종료 상태를 인계한다. | 독립 시나리오 리뷰로 기존 dirty 작업·서버·활성 task를 보존하며 이미 받은 게시 지시를 인계하는지 확인. |
| AC-04 | required는 PASS만, not-applicable은 구체적 근거의 N/A만 허용하고 stale·누락은 거절한다. | CLI/Stop fixture에서 required UI N/A와 빈 사유가 실패하고 사전 선언된 UI N/A만 통과. |
| AC-05 | 검증 완료 후 현재 task만 종료하며 다른 작업을 지우지 않는다. | 실제 CLI fixture로 missing/FAIL/stale finish는 활성 상태 보존, PASS finish는 해제, 다음 task activate 성공. |
| AC-06 | 강의 테스트 기준과 최소 테스트 원칙이 가이드·PR 템플릿·verifier에 일치한다. | 공통 verify 및 독립 가이드 검토, 실패 전후 동일 기대값·안정적인 경계·실제 환경·불필요 테스트 방지 확인. |

## 검증 범위

| Surface | 적용 | 이유 |
| --- | --- | --- |
| tests | required | Python CLI/훅의 완료 판정이 바뀌므로 회귀 fixture와 공통 검증을 실행한다. |
| api | not-applicable | TODO API와 서버 구현을 변경하지 않는다. 공통 HTTP 회귀 테스트는 tests 증거에 포함한다. |
| ui | not-applicable | 화면·사용자 앱 흐름을 변경하지 않는다. 스킬 문서 시나리오 리뷰는 AC-01~03에 포함한다. |
