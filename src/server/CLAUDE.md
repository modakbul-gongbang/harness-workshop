# 서버의 책임과 변경 경계

| 위치 | 책임 |
| --- | --- |
| `config.ts` | 환경 키·검증·부재 동작의 단일 레지스트리 |
| `database.ts` | SQLite 연결·테이블·최초 시드·영속 세션 키 |
| `session.ts` | 로그인·소유자·만료·CSRF·로그아웃 |
| `web/` | 요청 검증·HTTP 오류·공개 DTO |
| `service/` | TODO 작업 정책과 repository 호출 |
| `domain/` | TODO 타입과 소유자 조건을 포함한 SQL |

## 수정 경계

- web은 HTTP를 해석하고 service/domain은 검증된 값과 소유자를 받는다.
  repository에 Request·쿠키를 전달하지 않는다.
- DB와 세션 모듈의 `server-only` 경계를 유지한다.
  클라이언트에 필요한 타입은 실행 의존성이 없는 타입 파일에서 가져간다.
- 예상한 입력·권한·미존재 오류는 기존 오류 변환에 연결한다.
  예상 밖 오류는 `web/errors.ts`의 요청 ID와 구조화 이벤트로 추적하며 본문·토큰·SQL을 노출하지 않는다.
- 세션의 암호화 쿠키뿐 아니라 서버의 세션 유효성과 만료도 확인한다.
  로그아웃 후 이전 쿠키 재사용 거절을 유지한다.
- 환경 키는 `config.ts`와 `.env.example`을 함께 변경한다.
  다른 모듈의 임의 `process.env` 접근으로 설정 계약을 분산하지 않는다.
- DB 파일은 실행 상태다.
  빌드·테스트 편의를 위해 사용자 데이터나 최초 시드 표식을 지우지 않는다.

변경 전 [백엔드](../../docs/guides/backend.md), DB·설정 변경은 [마이그레이션](../../docs/guides/migration.md)도 읽는다.
목록 조회의 공개된 계층 예외는 [아키텍처](../../docs/architecture.md)의 해당 실습에서만 제거한다.
