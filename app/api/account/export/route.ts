import { exportAnalyses } from "@/lib/server/analyses";
import { jsonError } from "@/lib/server/http";
import { userFromRequest } from "@/lib/server/session";

/** "Download my data": everything we store about the signed-in user, as JSON. */
export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return jsonError("Please sign in.", 401);

  const analyses = await exportAnalyses(user.id);
  const body = {
    exportedAt: new Date().toISOString(),
    account: { name: user.name, email: user.email, createdAt: user.createdAt },
    analyses,
  };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gym-coach-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
