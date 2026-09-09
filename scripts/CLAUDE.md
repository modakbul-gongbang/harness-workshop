# 작업 상태와 검증 CLI

`task.py`가 PRD 범위·활성 작업·fingerprint·검증 보고서·완료 상태 전환의 단일 구현이다.
`.claude/hooks/`는 이 모듈을 호출하며 같은 판정 로직을 복제하지 않는다.
`verify.sh`는 로컬·독립 verifier·CI가 공유하는 검증 명령이다.

## 수정 경계

- Python 표준 라이브러리와 기존 CLI 구조를 사용한다.
  JSON 입력·파일 상태가 잘못됐으면 구체적인 오류와 실패 종료로 드러낸다.
- slug·보고서 구조·AC/G-ID·검증 범위의 검사를 유지한다.
  tests를 N/A로 만들거나 required의 BLOCKED를 PASS로 변환하지 않는다.
- fingerprint는 경로와 내용을 함께 검사한다.
  새 파일·삭제·이동도 stale이 되어야 하며 결과 저장 자체가 stale을 만들면 안 된다.
- `finish`는 최신 PASS 뒤 해당 활성 작업만 해제한다.
  다른 작업의 활성 상태를 지우거나 일반 대화를 완료로 만들지 않는다.
- Stop 재진입은 무한 재시도를 막되 미완료를 명시한다.
  보고서 작성 권한과 완료 판정은 독립 verifier 경계를 유지한다.
- 새 훅은 로컬 상태·사용자 파일에 어떤 영향을 주는지 명시한다.
  기존 서버를 종료하거나 자동 git stage·push를 실행하지 않는다.

변경 전 [검증 가이드](../docs/guides/testing.md)와 [훅 운영](../docs/guides/hooks.md)을 읽는다.
`python3 -m unittest discover -s scripts -p 'test_*.py' -v`로 임시 프로젝트에서 CLI·훅의 실제 입력/출력을 검사한다.
