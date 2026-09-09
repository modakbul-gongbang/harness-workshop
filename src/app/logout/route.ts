import { requireCsrf, signOut } from "@/server/session";
import { apiError, invalidInput } from "@/server/web/errors";

export async function POST(request: Request) {
  try {
    let token: unknown = request.headers.get("X-CSRF-TOKEN");
    if (!token) {
      try { token = (await request.formData()).get("_csrf"); } catch { throw invalidInput(); }
    }
    await requireCsrf(token);
    await signOut();
    return new Response(null, { status: 302, headers: { Location: "/login?logout" } });
  } catch (error) { return apiError(error); }
}
