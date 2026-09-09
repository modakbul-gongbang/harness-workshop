# 실제 경계에서 계약 확인

`api.test.ts`는 node:test에서 프로덕션 Next HTTP 서버를 띄우고 임시 SQLite 파일로 검증한다.
파일 안의 Browser helper는 쿠키를 유지하는 HTTP 클라이언트이며 실제 브라우저가 아니다.
`environment.test.ts`는 설정 레지스트리와 `.env.example`, 허용된 환경 접근 경계를 검사한다.

## 실행과 fixture

- API 테스트 전 `npm run build`로 현재 소스를 빌드한다.
  `npm test`만 실행하면 기존 빌드를 검사할 수 있다.
- 각 실행은 임시 DB 디렉터리와 별도 loopback 포트를 사용한다.
  준비 상태를 기다리고 시작 실패 진단과 종료 시간 제한을 유지한다.
- 테스트가 만든 프로세스·데이터만 정리한다.
  사용자의 8080 서버나 `data/`를 초기화하지 않는다.
- 테스트 시작 데이터를 명시하고 이전 테스트의 실행 순서·잔여 행에 의존하지 않는다.
  재기동 테스트에서는 의도적으로 같은 임시 DB를 유지한다.

## 단언과 결과

- 기본 계약은 BASE-ID, 작업의 기대 결과는 PRD AC-ID와 연결한다.
  여러 계약을 한 흐름으로 보호해도 되며 ID마다 중복 테스트를 만들지 않는다.
- 실제 응답·저장 결과·권한을 단언한다.
  repository/service를 mock하거나 private 함수 호출 순서를 검사하지 않는다.
- HTTP로 HTML 문구를 찾은 결과를 UI PASS로 보고하지 않는다.
  화면 변경은 실제 브라우저에서 필요한 상태와 사용자 흐름을 별도로 확인한다.
- Python task/gate fixture는 `scripts/test_harness.py`, 세션·편집 훅 fixture는 `scripts/test_editor_hooks.py`에 있다.
  둘 다 공통 검증에 포함된다.

추가 테스트의 비용·회귀 FAIL/PASS·검증 범위 판정은 [검증 가이드](../docs/guides/testing.md)를 따른다.
