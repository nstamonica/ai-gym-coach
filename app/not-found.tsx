import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-center">
      <Logo />
      <div className="space-y-3">
        <p className="font-display text-8xl leading-none font-bold text-iron-500 sm:text-9xl" aria-hidden>
          404
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight text-iron-50 uppercase">Page not found</h1>
        <p className="text-iron-400">That page doesn&apos;t exist, or it isn&apos;t yours to see.</p>
      </div>
      <Link href="/" className={buttonClasses()}>
        Go home
      </Link>
    </div>
  );
}
