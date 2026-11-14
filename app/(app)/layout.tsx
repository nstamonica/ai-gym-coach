import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/server/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Pages check the session themselves too (layouts don't re-run on every navigation).
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={{ name: user.name, email: user.email, image: user.image }} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-8 text-center text-xs leading-relaxed text-iron-400">
        AI feedback can be wrong and isn&apos;t a substitute for a qualified coach or medical advice.{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-iron-200">
          How we handle your data
        </Link>
      </footer>
    </div>
  );
}
