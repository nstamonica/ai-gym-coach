import Link from "next/link";
import { LogoMark } from "./logo";

export const SOURCE_URL = "https://github.com/nstamonica/ai-gym-coach";

export function SiteFooter() {
  return (
    <footer className="border-t border-iron-800/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-iron-400 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <LogoMark className="size-6" />
          <p>AI feedback can be wrong and isn&apos;t a substitute for a qualified coach or medical advice.</p>
        </div>
        <nav aria-label="Footer" className="flex gap-5">
          <Link href="/privacy" className="hover:text-iron-50">
            Privacy
          </Link>
          <a href={SOURCE_URL} className="hover:text-iron-50" target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
