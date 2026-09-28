"use client";

import { HistoryIcon, RotateCcwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import {
  restoreChapterAction,
  restoreVersionAction,
  saveVersionAction,
} from "@/server/actions/history";

export function SaveVersionButton({ storyId }: { storyId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveVersionAction(storyId, message);
      if (!result.ok) return void toast.error(result.error);
      toast.success(`Saved as version ${result.data.number}.`);
      setMessage("");
      setOpen(false);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <HistoryIcon /> Save a version
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Save a version</DialogTitle>
          <DialogDescription>
            Keeps a copy of your story exactly as it is now, drafts included. You can come back to
            it, compare it, or restore it any time.
          </DialogDescription>
          <label htmlFor="version-message" className="mt-5 block text-sm font-medium">
            Describe this version{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea
            id="version-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="e.g. Before rewriting the ending"
            className="mt-1.5 min-h-16"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RestoreVersionButton({
  storyId,
  number,
  size = "sm",
}: {
  storyId: string;
  number: number;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmDialog
      title={`Restore version ${number}?`}
      description={`Your story's details and chapters will go back to how they were in version ${number}. Your current work is saved first as a backup, so you can undo this. Readers keep seeing the published story until you publish again.`}
      confirmLabel="Restore"
      tone="default"
      onConfirm={() =>
        startTransition(async () => {
          const result = await restoreVersionAction(storyId, number);
          if (!result.ok) return void toast.error(result.error);
          toast.success(
            `Restored version ${number}. Your previous work is saved as version ${result.data.backupNumber}.`,
          );
          router.push(`/write/${storyId}`);
        })
      }
      trigger={
        <Button variant="outline" size={size} disabled={pending}>
          <RotateCcwIcon /> Restore
        </Button>
      }
    />
  );
}

export function RestoreChapterButton({
  storyId,
  number,
  chapterId,
  title,
}: {
  storyId: string;
  number: number;
  chapterId: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmDialog
      title={`Restore “${title}”?`}
      description={`This chapter's title and text will go back to how they were in version ${number}. The rest of your story isn't touched, and your current work is saved first as a backup.`}
      confirmLabel="Restore chapter"
      tone="default"
      onConfirm={() =>
        startTransition(async () => {
          const result = await restoreChapterAction(storyId, number, chapterId);
          if (!result.ok) return void toast.error(result.error);
          toast.success(`Restored “${title}”.`);
          router.push(`/write/${storyId}/chapters/${result.data.chapterId}`);
        })
      }
      trigger={
        <Button variant="ghost" size="sm" disabled={pending}>
          <RotateCcwIcon /> Restore this chapter
        </Button>
      }
    />
  );
}
