import type { Metadata } from "next";
import { FilmingTips } from "@/components/filming-tips";
import { PageHeader } from "@/components/page-header";
import { getQuota } from "@/lib/server/quota";
import { requireUser } from "@/lib/server/session";
import { AnalyzeFlow } from "./analyze-flow";

export const metadata: Metadata = { title: "New analysis" };

export default async function AnalyzePage() {
  const user = await requireUser();
  const quota = await getQuota(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="New analysis" subtitle="Upload a short clip of one set and the coach will review your form." />
      <AnalyzeFlow initialQuota={quota} tips={<FilmingTips />} />
    </div>
  );
}
