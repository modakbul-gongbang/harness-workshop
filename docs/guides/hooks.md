# 훅 운영과 검증

이 starter의 훅은 프로젝트 `.claude/settings.json`에 등록한다.
전역 플러그인 설치 없이 저장소의 Python 스크립트와 설치된 ESLint를 사용한다.

## 이벤트별 책임

| 이벤트 | 스크립트 | 결과 |
| --- | --- | --- |
| SessionStart: startup/resume/clear/compact | `session-context.py` | Node 버전·활성 작업·읽을 PRD·검증 명령을 컨텍스트에 복원 |
| PreToolUse: Write/Edit/Bash | `remind-guide.py` | 수정 경로의 가이드 알림과 구현자/verifier 보고서 권한 분리 |
| PostToolUse: Write/Edit | `lint-changed-file.py` | 편집된 TS/TSX 한 파일의 ESLint 오류 알림 |
| Stop | `check-completion.py` | 명시적 작업 완료 선언에서 최신 검증 보고서 검사 |

SessionStart는 상태를 읽기만 한다.
작업을 자동 활성화하거나 이전 보고서를 PASS로 인정하지 않는다.
활성 상태가 잘못됐으면 CONTEXT ERROR, Node가 없거나 맞지 않으면 환경 문제를 명시한다.
SessionStart 알림은 작업 차단 장치가 아니며 실제 Node 24 강제 검사는 `verify.sh`가 수행한다.

PostToolUse는 `src/`, `tests/` 아래 `.ts`/`.tsx`와 `next.config.ts`만 검사한다.
문서·검증 보고서·빌드 출력은 대상이 아니다.
해석된 경로가 프로젝트 밖이면 오류를 알리며 밖으로 향한 symlink도 검사하지 않는다.
파일 내용은 stdin으로 전달하고 파일명은 별도 인자로 주므로 `[id]`를 glob으로 해석하지 않는다.
셸 문자열을 실행하거나 패키지를 내려받지 않으며 `--fix`·git stage·파일 재작성도 하지 않는다.
오류가 없으면 조용히 끝내고, 오류가 있으면 최대 4,000자의 진단을 컨텍스트에 전달한다.
ESLint가 없거나 실행 실패·20초 초과이면 LINT NOT RUN으로 알린다.
이미 저장된 편집을 되돌리거나 후속 작업을 차단하지 않는다.
Bash로 바꾼 파일에는 이 편집 훅이 적용되지 않으므로 완료 전 공통 검증이 필요하다.

## 확인과 문제 해결

프로젝트 설정을 바꾼 뒤 새 Claude Code 세션에서 `/hooks`로 등록을 확인한다.
SessionStart에 표시되는 활성 작업이 실제 `.artifacts/active-task.json`과 맞는지 확인한다.
현재 세션이 새 설정을 반영했다고 가정하지 않는다.

```bash
python3 -m unittest discover -s scripts -p 'test_*.py' -v
./scripts/verify.sh
```

`test_editor_hooks.py`는 임시 프로젝트에서 시작·재개·기형 입력·대상 범위·실제 ESLint FAIL/PASS·파일 미변경을 검사한다.
`test_harness.py`는 기존 완료 gate와 권한 분리의 실제 입출력을 검사한다.
직접 스크립트를 실행한 fixture 검증과 Claude Code 런타임에서 이벤트가 발생한 확인은 별도 증거로 기록한다.

| 증상 | 확인할 것 |
| --- | --- |
| Node 환경 알림 | 해당 세션의 `node --version`과 PATH가 Node 24를 가리키는지 |
| LINT NOT RUN | `npm ci`, 파일 존재, 로컬 ESLint, `npm run lint`의 진단 |
| CONTEXT ERROR | 활성 작업 JSON의 형식과 slug, 훅 입력 이벤트 |
| 완료가 STALE | 보고서 이후 바뀐 코드·문서·Rules·훅을 반영한 새 독립 검증 |
| 훅이 보이지 않음 | 이 독립 프로젝트에서 세션을 열었는지와 `/hooks` 등록 |

훅은 교육용 협업 규칙이며 변조 방지 보안 경계가 아니다.
기존 역할 분리와 Stop의 범위·재진입 한계는 [아키텍처](../architecture.md)를 따른다.

## 참고한 예제와 선택 이유

[claude-code-hooks](https://github.com/karanb192/claude-code-hooks)의 세션 이벤트 구성과 [format-code](https://github.com/karanb192/claude-code-hooks/tree/main/plugins/format-code)의 편집 후 처리를 설계 참고로 사용했다.
외부 스크립트를 복사하거나 설치하지 않고 이 저장소의 도구와 역할 경계에 맞춰 작성했다.
편집 뒤 빠른 피드백에는 기존 ESLint를 사용하며 자동 포맷터나 새 패키지는 추가하지 않는다.
자동 stage는 미완성·다른 작업의 변경을 섞을 수 있고, 테스트 삭제의 일괄 차단은 근거 있는 중복 테스트 정리와 충돌하므로 채택하지 않는다.
이벤트 입출력은 [공식 훅 문서](https://code.claude.com/docs/en/hooks)를 기준으로 한다.
