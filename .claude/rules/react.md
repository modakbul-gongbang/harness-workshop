---
paths:
  - "src/**/*.tsx"
  - "src/app/**/*.css"
---

# React와 화면 작성 규칙

- 페이지는 Server Component에서 시작하고 state·이벤트·브라우저 API가 필요한 경계에만 `use client`를 둔다.
- 렌더 중 네트워크 요청이나 DOM 변경을 실행하지 않는다.
  비동기 effect는 이전 실행·언마운트 뒤 결과 반영을 방지한다.
- 사용자 입력은 텍스트 노드로 표시하고 목록 key는 안정적인 데이터 ID를 쓴다.
- 버튼·폼·label·dialog 등 의미에 맞는 HTML을 먼저 사용한다.
  클릭 가능한 div나 색상만으로 표현한 상태를 만들지 않는다.
- 색·간격·반경·타이포는 `src/app/globals.css` 토큰을 재사용한다.
  반복 스타일은 기존 클래스에 모으고 인라인 값으로 흩뜨리지 않는다.
- UX 상태·focus·한국어 모바일 검증의 상세 기준은 `docs/guides/frontend.md`를 따른다.
