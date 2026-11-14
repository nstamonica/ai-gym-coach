import type { NextRequest } from "next/server";
import { isUuid } from "@/lib/ids";
import { getThumbnail } from "@/lib/server/analyses";
import { safeEqual } from "@/lib/server/http";
import { userFromRequest } from "@/lib/server/session";

/**
 * The saved frame for an analysis. Visible to its owner, or to anyone with the
 * analysis's share token (`?token=`). Everyone else gets a 404, so ids can't be
 * probed for existence.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notFound = () => new Response("Not found", { status: 404 });
  if (!isUuid(id)) return notFound();

  const row = await getThumbnail(id);
  if (!row?.thumbnail) return notFound();

  const token = request.nextUrl.searchParams.get("token");
  const viaShareLink = Boolean(token && row.shareToken && safeEqual(token, row.shareToken));
  if (!viaShareLink) {
    const user = await userFromRequest(request);
    if (user?.id !== row.userId) return notFound();
  }

  return new Response(new Uint8Array(row.thumbnail), {
    headers: {
      "Content-Type": "image/jpeg",
      // Private: never stored by shared caches, so revoking a share link takes effect.
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
