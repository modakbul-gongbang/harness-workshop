# G-BACKEND: 백엔드

- `docs/baseline-contract.md`의 API/소유자/정렬/입력 계약을 보존한다.
- 검증된 세션의 사용자 이름만 소유자로 사용한다. 모든 조회/변경은 본인 조건을 유지한다.
- 없는 ID와 타인의 ID는 같은 404이며 존재 여부를 노출하지 않는다.
- 생성 201, 수정 200, 삭제 204, 오류 `{code,message}` 계약을 유지한다.
- 입력은 Zod strict object으로 검증하고 제목을 양끝 trim한다. DB 행을 API에 직접 노출하지 않는다.
- 변경 로직은 서비스 계층에 둔다. ticket 2의 공개된 목록 조회 예외만 PRD 범위 안에서 제거한다.
- 자체 repository/service를 mock하지 않는다. 본문·자격증명·토큰을 로그에 쓰지 않는다.
- 외부 키, 별도 서버 프레임워크, 불필요한 추상화를 추가하지 않는다.

## 변경을 넣을 위치

| 판단 | 위치 | 확인할 결과 |
| --- | --- | --- |
| JSON·ID·미지 필드·Content-Type 거절 | `src/server/web/todo-controller.ts` | 잘못된 입력의 400/415와 데이터 미변경 |
| 제목 정규화·작업 정책 | `src/server/service/todo-service.ts` | 저장된 제목과 공개 응답 |
| 소유자 격리·정렬·저장 | `src/server/domain/todo-repository.ts` | 두 사용자 데이터의 격리와 실제 DB 결과 |
| 오류의 HTTP 변환 | `src/server/web/errors.ts` | 기존 오류 계약과 예상 밖 오류의 요청 ID |
| 세션·CSRF | `src/server/session.ts` | 토큰 교체·만료·로그아웃 후 이전 쿠키 거절 |

인증·CSRF·형식 검증의 순서는 기존 controller를 따라 보존한다.
서비스 추출 같은 동작 보존 리팩토링에서 응답 상태·본문·정렬·오류 의미를 함께 바꾸지 않는다.
완료 여부는 목표 boolean을 받아 저장하며 재요청 때마다 반전하는 연산으로 바꾸지 않는다.
테스트의 상세 설계는 [검증 가이드](testing.md)를 따른다.
