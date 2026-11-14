import "server-only";
import type { Quota } from "@/lib/types";
import { quotaUsage, type QuotaLimits } from "./analyses";

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * Cost controls. Each analysis is one Gemini request, so cap how many a user
 * can run per rolling 24 hours, and how many the whole app can run, which
 * bounds the bill even if someone signs up with many accounts.
 */
export const QUOTA_LIMITS: QuotaLimits = {
  perUser: positiveInt(process.env.DAILY_ANALYSIS_LIMIT, 10),
  global: positiveInt(process.env.GLOBAL_DAILY_ANALYSIS_LIMIT, 200),
  windowMs: 24 * 60 * 60 * 1000,
};

export async function getQuota(userId: string): Promise<Quota> {
  const { used, nextSlotAt } = await quotaUsage(userId, QUOTA_LIMITS);
  const limit = QUOTA_LIMITS.perUser;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    nextSlotAt: nextSlotAt?.toISOString() ?? null,
  };
}
