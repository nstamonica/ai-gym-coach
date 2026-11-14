import { Dumbbell } from "lucide-react";
import { cx } from "@/lib/cx";

/** The saved frame for an analysis, or a placeholder. `token` is for share links. */
export function Thumbnail({
  id,
  hasThumbnail,
  token,
  alt = "",
  className,
}: {
  id: string;
  hasThumbnail: boolean;
  token?: string;
  alt?: string;
  className?: string;
}) {
  const box = cx("overflow-hidden bg-slate-800/70", className);
  if (!hasThumbnail) {
    return (
      <div className={cx(box, "grid place-items-center text-slate-500")} aria-hidden>
        <Dumbbell className="size-1/3 max-h-10 max-w-10" />
      </div>
    );
  }
  const src = `/api/analyses/${id}/thumbnail${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  return (
    <div className={box}>
      {/* A small JPEG served by our own API with auth checks; next/image would only add a resize step. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" className="size-full object-cover" />
    </div>
  );
}
