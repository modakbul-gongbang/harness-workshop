# 오늘 할 일: Claude Code 하네스 실습

Next.js와 TypeScript로 동작하는 작은 TODO 앱에서 **인터뷰 → PRD → 구현 → 독립 검증 → PR**을 연습하는 starter입니다.
강의 80분 + 라이브 실습 40분용이며, 두 실습 ticket은 PRD만 준비되어 있습니다.
Claude Code용 설정을 이 프로젝트 안에 포함하며 전역 설정이나 다른 런타임 설치는 하지 않습니다.

## 빠른 실행

필수: **Node.js 24**, npm, Python 3.10+, 최초 의존성 다운로드용 인터넷.

```bash
cd harness-workshop
node --version
npm ci
npm run dev
```

폴더 이름이 다르면 package.json이 있는 프로젝트 루트에서 실행합니다.
[http://localhost:8080](http://localhost:8080)을 엽니다.
Node 버전 관리자를 사용한다면 `.nvmrc`의 24 버전을 선택합니다.
설치와 공통 검증은 실제 실행 버전이 24가 아니면 중단합니다.
Windows에서 검증 셸은 Git Bash 또는 WSL을 사용합니다.
외부 API key, OAuth, 별도 백엔드, DB 서버는 필요하지 않습니다.
기본 서버는 loopback에만 바인딩합니다.

| 교육용 공개 계정 | 비밀번호 |
| --- | --- |
| minsu | workshop123! |
| jiyun | workshop123! |

실제 사용자 인증 서비스가 아닙니다.
개인정보를 넣거나 공개 인터넷에 배포하지 마세요.
각 계정은 본인 TODO만 보고 추가·수정·완료·되돌리기·삭제할 수 있습니다.
`data/todos.sqlite`에 데이터와 세션 상태가 유지되고 최초 시드는 한 번만 들어갑니다.
다른 형식의 기존 로컬 DB 파일은 자동 변환하거나 삭제하지 않습니다.

프로덕션 모드도 같은 Next 앱을 실행합니다.

```bash
npm run build
npm start
```

## 검증

```bash
./scripts/verify.sh
```

로컬/독립 verifier/CI가 같은 명령을 씁니다.
Python hook fixture → ESLint → TypeScript → Next 프로덕션 빌드 → TypeScript HTTP/환경 계약 테스트를 실행합니다.
HTTP 테스트는 실제 Next 서버를 임의 포트에 띄우고 임시 SQLite DB를 사용하므로 평소 data 폴더를 바꾸지 않습니다.
결과 로그는 `.artifacts/last-verify.log`입니다.
`npm test`만 실행하려면 먼저 `npm run build`를 완료해야 합니다.
CI는 테스트와 빌드를 확인하며 브라우저 검증을 대신하지 않습니다.

기대 결과는 [기본 계약](docs/baseline-contract.md)에 있습니다.
API는 로그인 세션과 CSRF를 사용하며 GET `/api/csrf`에서 `{token,headerName}`을 받습니다.
로그인 폼은 POST `/api/auth/login`, 로그아웃은 POST `/logout`에 `_csrf`를 보냅니다.
로그인 이후에는 새 CSRF 토큰을 받아야 합니다.

| 요청 | 입력 | 성공 응답 |
| --- | --- | --- |
| GET /api/todos | 없음 | 200 `{id,title,completed}[]` |
| POST /api/todos | `{title}` | 201 `{id,title,completed:false}` |
| PUT /api/todos/{id} | `{title,completed}` | 200 `{id,title,completed}` |
| DELETE /api/todos/{id} | 없음 | 204 |

변경 요청은 `X-CSRF-TOKEN` 헤더가 필요합니다.
제목은 1~120자이며 공백만으로 작성할 수 없습니다.
소유자는 서버 세션으로만 정하고 API에 노출하지 않습니다.

## Claude Code 준비와 명령

Claude Code 설치·로그인 후 **이 프로젝트 폴더에서** `claude`를 시작합니다.
프로젝트 신뢰/권한 화면에서 설정과 훅을 검토합니다.
전역 설정은 바꿀 필요가 없습니다.

```text
/deep-interview add-due-date 할 일에 마감일을 추가하고 싶어. PRD까지 작성해줘.
/write-prd add-due-date 변경할 동작 설명
/implement-prd docs/tasks/status-filter/prd.md
/create-pr status-filter
```

slug는 영문 소문자·숫자·하이픈만 사용합니다.
명확한 요청은 deep-interview를, 준비된 확정 PRD는 write-prd도 생략할 수 있습니다.
인터뷰는 메인 에이전트가 한 번에 한 질문씩 진행하고 `.artifacts/<slug>/interview.md`에 결정과 미해결 사항을 남깁니다.
외부 sasu CLI나 별도 interviewer 에이전트 없이 동작합니다.
PRD에는 그 기록의 중요한 결정을 본문에 옮겨 로컬 인터뷰 파일 없이도 이해할 수 있게 합니다.
create-pr는 사용자가 실제 게시를 요청한 경우에만 사용하며 remote와 최신 독립 검증이 필요합니다.
`/create-pr <slug>` 호출과 처음의 “구현하고 PR까지” 요청도 게시 요청이며 스킬 간에 인계합니다.
PRD까지만 요청하면 PRD에서 끝나고, 구현까지만 요청하면 검증과 로컬 커밋에서 끝납니다.
게시 명령은 프로젝트 permissions.ask로 별도 권한 검토를 거칩니다.

implement-prd는 코드·작업 상태 조사 → 작업 브랜치 → 로컬 계획 → 구현/테스트 → **새 컨텍스트 verifier** 순서입니다.
다른 작업의 dirty 파일·서버·미완료 task를 보존하고, 검증 앱은 별도 포트·테스트 데이터로 실행합니다.
verifier는 같은 PRD/가이드/코드와 실제 앱을 직접 검사합니다.
검증 보고서는 verifier가 쓰고, 구현자는 코드를 수정한 뒤 재검증을 요청합니다.

```bash
python3 scripts/task.py activate status-filter
python3 scripts/task.py snapshot status-filter
python3 scripts/task.py check status-filter
python3 scripts/task.py finish status-filter
# 미완료 작업을 명시적으로 중단/전환할 때만:
python3 scripts/task.py deactivate
```

activate는 `확정 여부: **확정**`과 검증 범위 표가 있는 PRD만 허용합니다.
check는 검증만 확인하고, finish는 최신 PASS를 확인한 뒤 해당 활성 task를 해제합니다.
finish는 다른 활성 task를 지우지 않으며 보고서를 남겨 나중의 PR 게시에도 check할 수 있습니다.
deactivate는 미완료 작업의 명시적인 중단·전환 명령이며 완료 처리하지 않습니다.
기본 상태에는 활성 task가 없으므로 일반 대화나 문서 작성이 막히지 않습니다.
`[TASK_COMPLETE:status-filter]`라는 명시적 완료 선언 시 최신 검증을 검사합니다.
막혔다면 원인과 `[TASK_BLOCKED:status-filter]`를 보고하며 Stop 재진입은 한 번만 허용합니다.
JSON 존재만으로 통과하지 않고 task/PRD/가이드/source/test/lockfile fingerprint, 모든 AC/G-ID와 PRD에서 선언한 검증 범위의 판정을 검사합니다.
tests는 항상 required입니다.
API/UI에 영향이 없으면 PRD의 검증 범위에서 not-applicable과 이유를 선언하고 verifier가 diff로 확인하여 N/A를 기록합니다.
required 항목의 도구 부재·실행 실패는 BLOCKED이며 N/A로 바꿔 통과시킬 수 없습니다.
표나 선언이 달라지면 기존 보고서는 stale이 됩니다.
node_modules와 .next는 순회 전에 제외하므로 설치·빌드 결과가 검증을 stale로 만들지 않습니다.
이것은 우회 가능한 교육용 로컬 협업 규칙이며 변조 불가능한 보안/승인 시스템이 아닙니다.

## PRD와 테스트의 연결

PRD의 기대 결과는 사용자 답변과 기본 계약에서 정합니다.
코드에서 관찰한 동작과 제품이 요구하는 정답을 구분하고, 정답·누락된 실패·경계 조건을 확인한 뒤 확정합니다.
테스트 설계는 [테스트 가이드](docs/guides/testing.md)를 따릅니다.

- PRD: 상황·입력·행동·기대 결과와 보존 동작, required/not-applicable 범위.
- 계획: 기존 테스트 재사용 또는 추가할 테스트, 잡을 버그, 안정적인 검증 경계와 선택 이유.
- 구현: 버그 수정 전 예상한 원인으로 FAIL, 수정 후 같은 기대값으로 PASS 및 관련 회귀 확인.
- verifier: 실제 실행과 함께 정답의 출처·누락 조건·중복/구현 종속 테스트를 독립 리뷰.
- PR: 검증된 결과, 비적용 이유, 과거 로그와 직접 실행 구분, 실제 CI와 사람의 검토 초점.

Unit은 정책·경계값, Integration은 연결, E2E는 소수의 핵심 흐름에 사용합니다.
매 AC마다 세 종류를 모두 만들지 않으며 기존 보호로 충분하면 테스트를 재사용합니다.
회귀 테스트는 버그가 재현되는 가장 낮고 안정적인 경계에 추가합니다.

템플릿: [인터뷰](.claude/skills/deep-interview/references/interview-template.md), [PRD](.claude/skills/write-prd/references/prd-template.md), [구현 계획](.claude/skills/implement-prd/references/plan-template.md), [PR](.github/pull_request_template.md).
CI workflow와 필수 검사·병합 보호 설정은 별개이며 실제 원격 설정을 확인하지 않고 강제된다고 주장하지 않습니다.

## 브라우저 MCP와 TypeScript LSP

`.mcp.json`은 Microsoft 공식 Playwright MCP `0.0.80`을 유지합니다.
Node/npm과 Chrome이 필요하며 기본은 headless + isolated입니다.
개인 브라우저 계정을 사용하지 않고 출력은 Git 제외 `.artifacts/browser/`에 보관합니다.

```bash
npx -y @playwright/mcp@0.0.80 --help
claude mcp list
```

Claude의 `/mcp`에서 프로젝트 서버를 승인하고 Playwright 상태를 확인합니다.
Chrome이 없으면 설치하거나 Playwright의 browser_install 도구를 요청합니다.
프로세스 연결과 실제 페이지 탐색/스크린샷 성공은 별도로 확인합니다.
UI가 required인데 브라우저 실행이 불가능하면 verifier의 UI 결과는 BLOCKED입니다.

TypeScript 언어 서버를 사용하려면 수강생이 아래 설치를 선택할 수 있습니다.
이 프로젝트는 전역 설치를 수행하지 않습니다.

```bash
npm install -g typescript-language-server typescript
typescript-language-server --version
```

Claude Code에서 `/plugin install typescript-lsp@claude-plugins-official`을 실행합니다.
언어 서버가 Claude 프로세스의 PATH에 있어야 합니다.
새 세션에서 `todoService.update` 정의와 `todoRepository.findByOwnerOrderByIdDesc` 참조를 요청해 실제 경로/결과를 확인합니다.
설치 목록에 보이는 것만으로 기동 성공이라고 하지 않습니다.
설치 기준: [공식 typescript-lsp README](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/typescript-lsp/README.md).

## 폴더 tour

| 경로 | 역할 |
| --- | --- |
| CLAUDE.md / 하위 CLAUDE.md | 명령, 코드 지도, 모듈별 수정 경계 |
| .claude/rules/ | 경로별 TypeScript·React·테스트·문서 컨벤션 |
| src/app/ | App Router 페이지, 레이아웃, API Route Handler, globals.css |
| src/components/ | React 목록/폼과 브라우저 API 호출 |
| src/server/ | 환경 레지스트리, 세션, SQLite, web/service/domain |
| tests/ | 실제 HTTP·로그인·파일 DB 및 환경 계약 테스트 |
| docs/architecture.md, glossary.md | 구조와 용어 |
| docs/guides/ | 백엔드/화면/검증/DB 규칙의 단일 원본 |
| docs/tasks/*/prd.md | Git 추적하는 작업 계약 |
| .claude/skills/ | deep-interview, write-prd, implement-prd, create-pr |
| .claude/agents/verifier.md | 독립 검증 역할 |
| .claude/hooks/ | 경로별 가이드 재안내, 완료 gate |
| scripts/ | 공통 검증과 작은 task 입출력 계약 |
| .artifacts/<slug>/ | Git 제외 인터뷰·계획·diff·로그·검증·화면·PR 본문 |

지역 CLAUDE.md는 모듈의 역할·수정 경계·검증 위치를 담습니다.
`.claude/rules/`는 TypeScript·React·테스트·문서 컨벤션을 경로별로 적용합니다.
상세 기준은 가이드에 모으며 [문서 지도](docs/README.md)에서 읽을 문서를 찾을 수 있습니다.
앱은 TypeScript로 작성하고 기존 Python 하네스는 유지합니다.

## 80분 강의 + 40분 라이브

| 구간 | 내용 |
| --- | --- |
| 강의 0~20분 | 앱 실행, 계정 분리, 기본 계약과 작은 변경 |
| 20~40분 | CLAUDE.md/지역 가이드와 스킬의 역할 |
| 40~60분 | PRD의 AC-ID, 독립 verifier, 실제 test/API/UI 증거 |
| 60~80분 | hooks/MCP/LSP, stale·FAIL·BLOCKED와 사람의 검토 |
| 라이브 0~5분 | 기본 앱 실행 및 공통 검증 |
| 5~15분 | status-filter PRD 읽기, 조사/계획/구현 요청 |
| 15~30분 | 테스트와 verifier, 실패 수정·재검증 |
| 30~40분 | 코드 변경으로 stale 재현, 결과 검토 및 PR 준비 설명 |

status-filter와 extract-list-service 두 실습 ticket은 미구현입니다.
extract-list-service는 서비스 분리 연습용 대체 ticket 또는 후속 과제입니다.
컨트롤러의 작은 repository 조회만 공개된 교육 시작점으로 남겨 두었습니다.
이 실습 예외는 계층 분리 원칙보다 우선하며 소유자 검사 예외는 허용하지 않습니다.
40분에 두 ticket을 반드시 끝내는 계약은 아닙니다.

## 독립 저장소와 설정

숨김 파일을 포함해 프로젝트를 복사하면 독립 저장소 루트로 사용할 수 있습니다.
복사에서 .git, node_modules, .next, data, .artifacts는 제외하고 `npm ci`로 설치합니다.
독립 저장소의 `.github/workflows/ci.yml`이 공통 검증을 실행합니다.
상위 폴더에 포함되어 있더라도 중첩 workflow가 상위 저장소에서 자동 실행되지는 않습니다.

기본값을 쓰면 .env 파일이 필요하지 않습니다.
저장 위치만 바꾸려면 `.env.local`에 WORKSHOP_DATA_DIR을 설정한 뒤 서버를 재시작합니다.
형식과 기본값은 `src/server/config.ts`, 예시는 `.env.example`에 있습니다.
포트 충돌은 `npm run dev -- --port 8081`로 해결합니다.
Node 24의 node:sqlite 경고는 런타임 API의 안정성 표시이며 테스트 성공 여부와는 별개입니다.

- 설치 실패: Node 24와 npm registry 연결을 확인합니다.
- DB 접근 오류: 저장 디렉터리 권한과 같은 DB를 쓰는 프로세스를 확인합니다.
- 시드 초기화: 서버를 종료하고 필요한 데이터가 없음을 확인한 뒤 이 샘플의 data 폴더만 삭제합니다.
- 403: 로그인 후의 새 CSRF 토큰을 사용합니다.
- stale: 새 독립 검증을 요청합니다. 임의 PASS를 작성하지 않습니다.
- 브라우저/검증 불가: BLOCKED와 필요한 다음 행동을 기록합니다.

스택 기준: [Next.js 설치](https://nextjs.org/docs/app/getting-started/installation), [iron-session](https://github.com/vvo/iron-session), [Node 24 SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html).
Windows/Linux 실행, 원격 CI, 전역 LSP 설치 여부는 로컬 검증으로 대신하지 않습니다.

### 세션과 편집 피드백

SessionStart는 현재 Node 환경과 활성 작업을 알려주고, PostToolUse는 수정한 TS/TSX 파일만 ESLint로 검사합니다.
기존 가이드 알림과 완료 검증 훅도 유지됩니다.
자동 파일 수정·stage는 수행하지 않으며 상세 범위와 문제 해결은 [훅 운영 가이드](docs/guides/hooks.md)를 참고합니다.
설정 변경 후 새 Claude Code 세션의 `/hooks`에서 등록을 확인합니다.
