import LoginForm from "@/components/login-form";

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <main className="login-shell">
    <p className="eyebrow">TODO WORKSHOP</p><h1>오늘 할 일</h1>
    <p className="muted">내 할 일을 적고, 하나씩 마쳐 보세요.</p>
    {params.error !== undefined && <p role="alert" className="error">아이디 또는 비밀번호를 확인하세요.</p>}
    {params.logout !== undefined && <p role="status">로그아웃했습니다.</p>}
    <LoginForm />
    <aside className="training"><strong>교육용 공개 계정</strong><p><code>minsu</code> 또는 <code>jiyun</code><br />비밀번호 <code>workshop123!</code></p><small>실습용 로컬 앱입니다. 실제 개인정보를 입력하지 마세요.</small></aside>
  </main>;
}
