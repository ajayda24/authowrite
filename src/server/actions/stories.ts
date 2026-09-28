"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/session";
import * as chapters from "@/server/services/chapters";
import * as stories from "@/server/services/stories";
import type { StoryStatus } from "@/server/db/schema";
import { run } from "./result";

export async function createStoryAction(_prev: unknown, formData: FormData) {
  const viewer = await getViewer();
  const result = await run(() =>
    stories.createStory(viewer, { title: String(formData.get("title") ?? "") }),
  );
  if (!result.ok) return result;
  redirect(`/write/${result.data.story.id}/chapters/${result.data.firstChapterId}`);
}

export async function updateStoryAction(storyId: string, input: stories.UpdateStoryInput) {
  const viewer = await getViewer();
  const result = await run(() => stories.updateStory(viewer, storyId, input));
  revalidatePath(`/write/${storyId}`, "layout");
  return result;
}

export async function setStoryStatusAction(storyId: string, status: StoryStatus) {
  const viewer = await getViewer();
  const result = await run(() => stories.setStoryStatus(viewer, storyId, status));
  revalidatePath("/", "layout");
  return result;
}

export async function deleteStoryAction(storyId: string) {
  const viewer = await getViewer();
  const result = await run(() => stories.deleteStory(viewer, storyId));
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function addChapterAction(storyId: string) {
  const viewer = await getViewer();
  const result = await run(() => chapters.addChapter(viewer, storyId));
  if (!result.ok) return result;
  redirect(`/write/${storyId}/chapters/${result.data.id}`);
}

export async function saveChapterAction(
  chapterId: string,
  input: { title?: string; content: unknown; expectedRevision: number },
) {
  const viewer = await getViewer();
  return run(async () => {
    const saved = await chapters.saveChapter(viewer, chapterId, input);
    return {
      revision: saved.revision,
      wordCount: saved.wordCount,
      savedAt: saved.updatedAt.toISOString(),
    };
  });
}

export async function publishChapterAction(chapterId: string, publishStory: boolean, message = "") {
  const viewer = await getViewer();
  const result = await run(() =>
    chapters.publishChapter(viewer, chapterId, { publishStory, message }),
  );
  revalidatePath("/", "layout");
  return result;
}

export async function setChapterStatusAction(chapterId: string, status: "draft" | "published") {
  const viewer = await getViewer();
  const result = await run(() => chapters.setChapterStatus(viewer, chapterId, status));
  revalidatePath("/", "layout");
  return result;
}

export async function renameChapterAction(chapterId: string, title: string) {
  const viewer = await getViewer();
  const result = await run(() => chapters.renameChapter(viewer, chapterId, title));
  revalidatePath("/", "layout");
  return result;
}

export async function moveChapterAction(chapterId: string, direction: "up" | "down") {
  const viewer = await getViewer();
  const result = await run(() => chapters.moveChapter(viewer, chapterId, direction));
  revalidatePath("/", "layout");
  return result;
}

export async function deleteChapterAction(chapterId: string) {
  const viewer = await getViewer();
  const result = await run(() => chapters.deleteChapter(viewer, chapterId));
  revalidatePath("/", "layout");
  return result;
}
