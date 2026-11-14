"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/ids";
import { deleteAnalysis, setShareToken } from "@/lib/server/analyses";
import { randomToken } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";

// Server actions are public HTTP endpoints, so each one checks the session and
// only ever touches the signed-in user's own rows.

export async function deleteAnalysisAction(id: string): Promise<void> {
  const user = await requireUser();
  if (!isUuid(id)) return;
  await deleteAnalysis(id, user.id);
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

/** Turns the public share link on (a fresh token each time) or off. */
export async function setSharingAction(id: string, shared: boolean): Promise<{ token: string | null }> {
  const user = await requireUser();
  if (!isUuid(id)) throw new Error("Analysis not found.");
  const token = shared ? randomToken() : null;
  if (!(await setShareToken(id, user.id, token))) throw new Error("Analysis not found.");
  revalidatePath(`/analyses/${id}`);
  return { token };
}
