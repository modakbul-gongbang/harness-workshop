import Link from "next/link";
export default function NotFound() {
  return <main className="shell"><h1>페이지를 찾을 수 없습니다.</h1><Link href="/">내 목록으로</Link></main>;
}
