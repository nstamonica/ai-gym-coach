import { VideoOff } from "lucide-react";
import { cx } from "@/lib/cx";

/**
 * The saved frame for an analysis. Without one, a tile with the lift's gym
 * shorthand ("SQ", "DL") stands in. `token` is for share links.
 */
export function Thumbnail({
  id,
  hasThumbnail,
  abbreviation,
  token,
  alt = "",
  className,
}: {
  id: string;
  hasThumbnail: boolean;
  abbreviation?: string;
  token?: string;
  alt?: string;
  className?: string;
}) {
  const box = cx("overflow-hidden bg-iron-800", className);
  if (!hasThumbnail) {
    return (
      <div
        className={cx(
          box,
          "grid place-items-center",
        )}
        aria-hidden
      >
        {abbreviation ? (
          <span className="font-display text-2xl leading-none font-bold tracking-wide text-iron-300 uppercase">
            {abbreviation}
          </span>
        ) : (
          <VideoOff className="size-6 text-iron-500" />
        )}
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
