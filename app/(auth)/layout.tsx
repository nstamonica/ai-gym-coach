import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col px-4 py-8 sm:py-12">
      <header className="mx-auto w-full max-w-md">
        <Logo />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</main>
      <footer className="mx-auto w-full max-w-md text-center text-sm text-slate-400">
        <Link href="/privacy" className="hover:text-slate-200">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
