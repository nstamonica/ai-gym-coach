import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/ids";
import {
  claimAnalysis,
  completeAnalysis,
  failAnalysis,
  getAnalysis,
  getAnalysisStatus,
  getPreviousResult,
  recentSessions,
  releaseAnalysis,
} from "@/lib/server/analyses";
import { coachVideo } from "@/lib/server/coach";
import { UserFacingError } from "@/lib/server/errors";
import { deleteGeminiFile } from "@/lib/server/gemini";
import { jsonError } from "@/lib/server/http";
import { userFromRequest } from "@/lib/server/session";
import type { AnalysisView } from "@/lib/types";

// Processing + analysis (with model fallbacks) can take a while. 300s is the Vercel Hobby maximum.
export const maxDuration = 300;

/**
 * Step 2 of an analysis: the browser has uploaded the video to Gemini. Analyze
 * it, save the result and delete the video.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await userFromRequest(request);
  if (!user) return jsonError("Please sign in to analyze a video.", 401);

  const { id } = await params;
  if (!isUuid(id)) return jsonError("Analysis not found.", 404);

  const claim = await claimAnalysis(id, user.id);
  if (!claim) {
    switch (await getAnalysisStatus(id, user.id)) {
      case "complete": {
        // Already done (e.g. the response was lost and the browser retried): return the saved result.
        const saved = await getAnalysis(id, user.id);
        return NextResponse.json(saved && (await withPrevious(user.id, saved)));
      }
      case "processing":
        return jsonError("This video is still being analyzed. Give it a moment and try again.", 409, { retryable: true });
      case "failed":
        return jsonError("This analysis can't be completed. Please upload the video again.", 410);
      default:
        return jsonError("Analysis not found.", 404);
    }
  }

  let keepUpload = false;
  try {
    const history = await recentSessions(user.id, id);
    const { analysis, model, videoSeconds } = await coachVideo(claim.geminiFile, { notes: claim.notes, history });
    const saved = await completeAnalysis(id, analysis, { model, videoSeconds });
    if (!saved) return jsonError("This analysis was deleted.", 404);
    return NextResponse.json(await withPrevious(user.id, saved));
  } catch (error) {
    if (error instanceof UserFacingError) {
      if (error.retryable) {
        // Keep the upload so "Try again" doesn't need another upload.
        keepUpload = true;
        await releaseAnalysis(id);
      } else {
        await failAnalysis(id, error.message);
      }
      return jsonError(error.message, error.status, { retryable: error.retryable });
    }
    console.error("Analysis error:", error);
    await failAnalysis(id, "Unexpected error while analyzing.");
    return jsonError("Something went wrong while analyzing your video. Please try again.", 500);
  } finally {
    // Don't keep people's videos around any longer than needed.
    if (!keepUpload) await deleteGeminiFile(claim.geminiFile);
  }
}

async function withPrevious(userId: string, analysis: AnalysisView) {
  const previous = analysis.isExercise
    ? await getPreviousResult(userId, analysis.exerciseKey, new Date(analysis.createdAt))
    : null;
  return { analysis, previous };
}
