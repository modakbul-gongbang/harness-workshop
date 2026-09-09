import { csrfToken } from "@/server/session";
import { apiError } from "@/server/web/errors";

export async function GET() {
  try { return Response.json({ token: await csrfToken(), headerName: "X-CSRF-TOKEN" }); }
  catch (error) { return apiError(error); }
}
