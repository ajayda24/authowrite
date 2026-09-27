"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setStoryStatusAction } from "@/server/actions/stories";

export function PublishStoryBanner({
  storyId,
  status,
  publishedChapters,
}: {
  storyId: string;
  status: string;
  publishedChapters: number;
}) {
  const [pending, startTransition] = useTransition();
  if (status !== "draft") return null;

  const ready = publishedChapters > 0;
  return (
    <div className="bg-muted/60 flex flex-col gap-3 rounded-md border px-4 py-3.5 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm leading-relaxed">
        {ready ? (
          <>
            This story is a <strong>draft</strong>. Only you can see it. Publish it when you’re
            ready for readers.
          </>
        ) : (
          <>
            This story is a <strong>draft</strong>, visible only to you. Open a chapter and press{" "}
            <strong>Publish</strong> when it’s ready.
          </>
        )}
      </p>
      {ready ? (
        <Button
          size="sm"
          variant="accent"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setStoryStatusAction(storyId, "published");
              if (result.ok) toast.success("Your story is live.");
              else toast.error(result.error);
            })
          }
        >
          Publish story
        </Button>
      ) : null}
    </div>
  );
}
