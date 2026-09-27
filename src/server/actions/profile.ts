"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/server/auth/session";
import * as users from "@/server/services/users";
import { run } from "./result";

export async function updateProfileAction(input: { name: string; username: string; bio: string; image?: string | null }) {
  const viewer = await getViewer();
  const result = await run(() => users.updateProfile(viewer, input));
  revalidatePath("/", "layout");
  return result;
}
