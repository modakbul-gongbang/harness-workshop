---
name: implement-prd
description: 확정 PRD를 조사·구현·테스트·독립 검증하고 요청된 경우 create-pr로 전달한다.
argument-hint: "docs/tasks/<slug>/prd.md"
disable-model-invocation: true
---

PRD: $ARGUMENTS

## 준비와 계획

1. 명시한 PRD, 루트/관련 지역 CLAUDE.md, baseline-contract와 네 가이드를 읽는다.
   미확정이거나 제품 판단이 남으면 BLOCKED로 보고하고 write-prd로 돌아간다.
2. **첫 구현 단계에서** 현재 코드·테스트와 Git 상태·현재 브랜치·원격·활성 task를 조사한다.
   다른 task가 활성 상태면 그 PRD와 보고서를 확인한다.
   최신 PASS인 완료 작업만 `python3 scripts/task.py finish <old-slug>`로 정리한다.
   미완료 작업은 임의 해제하지 않고 사용자 전환 지시가 있을 때만 deactivate하며 미완료임을 기록한다.
   unrelated dirty 파일은 보존하며 분리가 어렵다면 별도 worktree를 사용한다.
   main에서 구현하지 않고 현재 기준점에서 작업 브랜치를 만든다.
   이미 해당 task 브랜치라면 재사용하고 기준 커밋·브랜치 이름을 계획에 기록한다.
3. `python3 scripts/task.py activate <slug>`를 실행한다.
   `references/plan-template.md`로 `.artifacts/<slug>/plan.md`를 작성한다.
   AC별 기존 테스트 재사용/추가 여부, 선택한 가장 낮고 안정적인 검증 경계, 잡으려는 버그와 명령을 적는다.
   Unit/Integration/E2E를 모두 추가하지 않고 가이드의 비용·중복 기준을 따른다.
   사용자에게 이미 받은 PR 게시 요청은 범위와 함께 계획에 기록하여 전달한다.

## 구현과 검증

4. 확정 범위 안에서 구현한다.
   버그 수정은 변경 전에 같은 기대값의 재현 테스트가 예상한 버그로 실패함을 먼저 기록한다.
   수정 후 동일 테스트와 관련 기존 테스트를 실행한다.
   기대값 변경은 독립적인 요구사항 변경 또는 확인된 테스트 결함을 근거로 한다.
   현실적 mutation과 회귀 재현은 다른 증거이며 하나를 다른 것으로 대신하지 않는다.
5. `./scripts/verify.sh`를 실행하고 실패 원인을 해결한다.
   PRD에서 API/UI required이면 검증 앱을 준비한다.
   기존 서버의 경로·브랜치·실행 버전을 확인하고 다른 작업의 서버를 종료하거나 재사용하지 않는다.
   사용 중인 서버와 충돌하지 않는 포트와 `.artifacts/<slug>/browser-data`를 사용한다.
   예: `WORKSHOP_DATA_DIR=.artifacts/<slug>/browser-data npm run dev -- --port 8187`.
   실제 포트 사용 여부부터 확인하고 실행 PID·명령·URL·시작 데이터를 계획에 기록한다.
   Node 24를 실행한 셸의 PATH가 verifier에도 전달되게 한다.
   테스트는 별도 임시 DB를 쓰며 사용자 data 폴더를 초기화하지 않는다.
6. 기준 커밋부터 현재까지의 tracked diff와 새 파일 목록을 `.artifacts/<slug>/review-diff.txt`로 준비한다.
   새 컨텍스트의 프로젝트 `verifier` subagent에 PRD 경로, 프로젝트 루트, 계획·diff 경로, 앱 URL 또는 비적용 근거, 보고서 경로를 전달한다.
   예상 PASS나 구현자의 테스트 요약을 정답으로 주지 않는다.
   verifier가 같은 PRD/가이드/현재 코드/테스트를 직접 읽고 스스로 실행하게 한다.
7. 구현자는 `verification.json`/`verification.md`를 작성하거나 결과를 바꾸지 않는다.
   FAIL은 구현자가 소스를 수정한 뒤 새 verifier를 요청한다.
   BLOCKED는 원인과 다음 행동을 보고한다.
   required 검증을 실행하지 못했다고 PRD를 not-applicable로 낮추지 않는다.

## 완료와 전달

8. `python3 scripts/task.py check <slug>`로 최신 검증을 확인한다.
   이후 소스·테스트·PRD·가이드·문서 수정은 stale이므로 새 verifier가 필요하다.
   범위를 지정해 자기 변경만 커밋하고 `check`를 다시 실행한다.
   변경이 없고 이미 해당 커밋이 있으면 불필요한 빈 커밋을 만들지 않는다.
9. PR까지 요청받았다면 create-pr 스킬을 읽고 같은 slug·브랜치·게시 요청을 넘겨 계속 진행한다.
   명시적 게시 요청이 없으면 로컬 구현 완료에서 끝낸다.
   원격/게시 범위 등 필요한 정보만 확인하며 이미 받은 게시 허가를 반복해서 묻지 않는다.
10. `python3 scripts/task.py finish <slug>`는 최신 PASS를 다시 검사한 뒤 활성 task만 해제한다.
    완료 후에도 보고서는 남아 create-pr가 다시 check할 수 있다.
    내가 만든 검증 서버·브라우저만 정리하고 사용자가 유지 요청한 서버는 남긴다.
    결과·커밋·실행한 검증·한계를 `[TASK_COMPLETE:<slug>]`와 함께 반환한다.
    불가하면 task를 미완료 상태로 유지하고 `[TASK_BLOCKED:<slug>]`로 끝낸다.

계획·로그·화면·검증 파일은 `.artifacts/<slug>/`에만 둔다.
