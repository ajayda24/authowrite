"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { addCommentAction, deleteCommentAction } from "@/server/actions/social";

export function CommentForm({ storyId, chapterId, path }: { storyId: string; chapterId: string | null; path: string }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const body = String(new FormData(event.currentTarget).get("body") ?? "");
        startTransition(async () => {
          const result = await addCommentAction({ storyId, chapterId, body, path });
          if (result.ok) formRef.current?.reset();
          else toast.error(result.error);
        });
      }}
    >
      <label htmlFor="comment-body" className="sr-only">Your comment</label>
      <Textarea id="comment-body" name="body" placeholder="What did you think?" maxLength={5000} rows={3} required />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : "Post comment"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteCommentButton({ commentId, path }: { commentId: string; path: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="mt-1 text-xs text-subtle-foreground hover:text-destructive"
      onClick={() => {
        if (!confirm("Delete this comment?")) return;
        startTransition(async () => {
          const result = await deleteCommentAction(commentId, path);
          if (!result.ok) toast.error(result.error);
        });
      }}
    >
      Delete
    </button>
  );
}
