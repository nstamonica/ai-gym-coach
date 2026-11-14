"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteAnalysisAction } from "../actions";

export function DeleteAnalysisButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" className="w-full text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" aria-hidden />
        Delete analysis
      </Button>
    );
  }

  return (
    <div role="alertdialog" aria-label="Confirm delete" className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
      <p className="text-sm text-red-100">Delete this analysis? This can&apos;t be undone.</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirming(false)} disabled={pending} autoFocus>
          Cancel
        </Button>
        <Button
          variant="danger"
          size="sm"
          className="flex-1"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteAnalysisAction(id);
              router.replace("/history");
            })
          }
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
