import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-center">
      <Logo />
      <div className="space-y-2">
        <p className="text-sm font-semibold text-blue-300">404</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Page not found</h1>
        <p className="text-slate-400">That page doesn&apos;t exist, or it isn&apos;t yours to see.</p>
      </div>
      <Link href="/" className={buttonClasses()}>
        Go home
      </Link>
    </div>
  );
}
