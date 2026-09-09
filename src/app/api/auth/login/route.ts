import { requireCsrf, signIn } from "@/server/session";
import { apiError, invalidInput } from "@/server/web/errors";

export async function POST(request: Request) {
  try {
    let form: FormData;
    try { form = await request.formData(); } catch { throw invalidInput(); }
    await requireCsrf(form.get("_csrf"));
    const success = await signIn(form.get("username"), form.get("password"));
    return new Response(null, { status: 302, headers: { Location: success ? "/" : "/login?error" } });
  } catch (error) { return apiError(error); }
}
