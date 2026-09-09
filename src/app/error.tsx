"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="shell"><h1>화면을 불러오지 못했습니다.</h1><p role="alert">잠시 후 다시 시도하세요.</p><button onClick={reset}>다시 시도</button></main>;
}
