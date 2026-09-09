---
name: create-pr
description: 최신 독립 검증을 확인하고 요청받은 GitHub PR을 커밋·푸시·게시·확인한다.
argument-hint: "<task-slug>"
disable-model-invocation: true
---

Task: $ARGUMENTS

1. 사용자의 게시 요청을 확인한다.
   `/create-pr <slug>` 호출 자체와 앞 단계에서 전달된 명시적 “PR까지” 요청도 게시 요청이다.
   이미 받은 요청은 다시 승인받지 않는다.
   요청이 없으면 PR 본문 초안까지 준비하고 실제 게시하지 않는다.
2. PRD, 계획의 기준 커밋·브랜치·게시 범위, Git 상태·remote·base를 확인한다.
   main에서 직접 게시하지 않고 해당 task 브랜치를 사용한다.
   다른 작업의 dirty 파일과 이미 열린 PR을 확인하고 중복 PR을 만들지 않는다.
   remote가 없으면 새 저장소를 임의 생성하지 않고 필요한 정보를 보고한다.
3. `python3 scripts/task.py check <slug>`와 기준 커밋부터 현재까지의 diff를 확인한다.
   커밋 후 작업 트리 diff가 비었다는 이유로 변경이 없다고 판단하지 않는다.
   missing/FAIL/BLOCKED/stale이면 독립 verifier가 필요하다.
   활성 task가 없으면 이 slug를 activate하고, 다른 미완료 task가 있으면 임의 해제하지 않는다.
   필요한 앱·계획·diff를 준비하여 implement-prd의 독립 검증 절차를 따른다.
4. `.github/pull_request_template.md`를 읽고 PRD 결과·검증 범위·AC/가이드 판정·사람의 검토 초점·한계를 요약한다.
   주요 UI 증거는 GitHub 첨부 등 원격에서 볼 수 있는 형태로 준비한다.
   로컬 `.artifacts/` 경로만 링크하지 않으며 첨부할 수 없으면 본문에 한계를 명시한다.
   본문 초안은 `.artifacts/<slug>/pr-body.md`로 저장한다.
5. 미커밋 변경이 있으면 범위를 지정하여 자기 변경만 커밋한다.
   `docs/tasks/<slug>/`에는 PRD만, 계획·로그·보고서는 Git 제외 상태로 둔다.
   도구/모델 attribution을 넣지 않는다.
   `check`를 다시 실행하고 일반 push 후 PR을 생성하거나 기존 해당 PR을 업데이트한다.
   gh를 쓰면 `--body-file .artifacts/<slug>/pr-body.md`로 실제 줄바꿈을 보존한다.
   게시에 실패하면 커밋·push·PR 중 어디까지 완료됐는지와 다음 행동을 명확히 남긴다.
6. 실제 PR URL·head/base·원격 tip·CI 상태와 이미지 표시 여부를 확인한다.
   CI 대기·실패·미실행을 PASS로 보고하지 않는다.
   이 단계는 PR 생성까지이며 병합은 별도 요청이 필요하다.
   `python3 scripts/task.py finish <slug>`로 최신 검증을 확인하고 활성 상태를 정리한다.
   브랜치·커밋·PR URL·검증 결과와 남은 사람의 검토 항목을 반환한다.
