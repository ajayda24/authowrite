"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/server/auth/session";
import * as history from "@/server/services/history";
import { run } from "./result";

export async function saveVersionAction(storyId: string, message: string) {
  const viewer = await getViewer();
  const result = await run(async () => {
    const version = await history.saveVersion(viewer, storyId, message);
    return { number: version.number };
  });
  revalidatePath(`/write/${storyId}`, "layout");
  return result;
}

export async function restoreVersionAction(storyId: string, number: number) {
  const viewer = await getViewer();
  const result = await run(() => history.restoreVersion(viewer, storyId, number));
  revalidatePath("/", "layout");
  return result;
}

export async function restoreChapterAction(storyId: string, number: number, chapterId: string) {
  const viewer = await getViewer();
  const result = await run(() => history.restoreChapter(viewer, storyId, number, chapterId));
  revalidatePath("/", "layout");
  return result;
}
