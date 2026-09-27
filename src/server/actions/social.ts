"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/server/auth/session";
import * as social from "@/server/services/social";
import { recordStoryView } from "@/server/services/stories";
import { run } from "./result";

export async function setLikeAction(storyId: string, liked: boolean) {
  const viewer = await getViewer();
  const result = await run(() => social.setLike(viewer, storyId, liked));
  revalidatePath("/", "layout");
  return result;
}

export async function setBookmarkAction(storyId: string, bookmarked: boolean) {
  const viewer = await getViewer();
  const result = await run(() => social.setBookmark(viewer, storyId, bookmarked));
  revalidatePath("/", "layout");
  return result;
}

export async function setFollowAction(userId: string, following: boolean) {
  const viewer = await getViewer();
  const result = await run(() => social.setFollow(viewer, userId, following));
  revalidatePath("/", "layout");
  return result;
}

export async function addCommentAction(input: {
  storyId: string;
  chapterId: string | null;
  body: string;
  path: string;
}) {
  const viewer = await getViewer();
  const result = await run(async () => {
    await social.addComment(viewer, input);
  });
  if (result.ok) revalidatePath(input.path);
  return result;
}

export async function deleteCommentAction(commentId: string, path: string) {
  const viewer = await getViewer();
  const result = await run(() => social.deleteComment(viewer, commentId));
  if (result.ok) revalidatePath(path);
  return result;
}

export async function saveProgressAction(input: {
  storyId: string;
  chapterId: string;
  percent: number;
}) {
  const viewer = await getViewer();
  if (!viewer) return { ok: true as const };
  return run(() => social.saveReadingProgress(viewer, input));
}

export async function recordViewAction(storyId: string) {
  await run(() => recordStoryView(storyId));
}
