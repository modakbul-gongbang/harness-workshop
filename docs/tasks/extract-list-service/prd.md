# extract-list-service

확정 여부: **확정**, 교육 계약에 따른 실습용 PRD이며 starter에서 미구현.

## 문제 / 범위

`src/server/web/todo-controller.ts`의 `listTodos`에 작은 legacy 조회/매핑 로직이 남아 있다.
목록 조회를 기존 `todoService`의 서비스 계층 패턴으로 분리하고 컨트롤러의 repository 의존을 제거한다.
서비스는 기존 repository를 통해 도메인 값을 반환하고 API DTO 매핑은 web 경계에 유지한다.
단일 SELECT에는 별도 읽기 트랜잭션을 도입하지 않는다.
코드 조사는 implement-prd 첫 단계에서 직접 한다.

## 비범위 / 보존 동작

status 필터, 검색, 새 서비스 체계, 전체 구조 개편, 스키마/인증/시드 변경은 제외한다.
API 응답 필드/HTTP 상태/정렬/소유자/빈 배열과 기존 변경 서비스의 동작을 유지한다.
두 ticket은 starter에서 각각 수행할 수 있다.
필터 ticket 이후 실행한다면 이미 확정된 필터 동작도 보존 대상으로 테스트한다.

## 결정 근거

교육용 확정 계약은 본문과 기본 계약이다.
행동 보존 리팩터링이므로 기존 테스트의 기대값은 유지하며 내부 함수 호출 횟수 테스트를 추가하지 않는다.
서비스 경로 분리 자체는 독립 코드 리뷰로 확인한다.

## 관련 가이드

`docs/guides/backend.md`, `docs/guides/frontend.md`, `docs/guides/testing.md`, `docs/guides/migration.md`.

## 완료·검증 조건

| ID | 완료 조건 | 검증 조건 |
| --- | --- | --- |
| AC-01 | 목록 조회가 기존 서비스 패턴에 있고 컨트롤러는 repository에 의존하지 않는다. | 독립 verifier가 Route Handler/컨트롤러/서비스/repository 호출 경로를 직접 검사. |
| AC-02 | JSON 필드·HTTP 상태·id 내림차순과 []를 그대로 유지한다. | 같은 fixture와 기대값의 기존 HTTP 계약 테스트를 변경 전후 실행. 본인 두 행은 id 내림차순·동일 DTO, 본인 행이 없으면 []. |
| AC-03 | 목록과 변경 모두 본인 데이터에 한정한다. | 두 사용자 혼합 DB와 타인 ID 수정/삭제 거절 테스트 통과. |
| AC-04 | 기본 UI CRUD 동작과 가이드를 보존한다. | 공통 verify와 브라우저 로그인/목록/추가/수정/완료/되돌리기/삭제 확인, G-ID별 검토. |
| AC-05 | 범위 밖 변경과 obsolete 조회 경로가 없다. | diff로 필터/스키마/시드/계정 변경 없음, 옮긴 조회 중복 없음 확인. |

## 질문

미해결 질문 없음.
이 legacy 위치는 공개된 교육용 예외이며 보안 결함을 숨긴 시작점이 아니다.

## 검증 범위

| Surface | 적용 | 이유 |
| --- | --- | --- |
| tests | required | 공통 검증과 변경·보존 계약의 회귀를 확인한다. |
| api | required | 조회·소유자·HTTP 계약이 변경 또는 리팩터링 대상이다. |
| ui | required | 새 화면 동작 또는 기존 핵심 사용자 흐름의 보존을 확인한다. |
