import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./index";

export interface Viewer {
  id: string;
  name: string;
  username: string;
  image: string | null;
}

/** The signed-in user for this request, or null. Memoized per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = session.user as typeof session.user & { username?: string | null };
  return {
    id: user.id,
    name: user.name,
    username: user.username ?? "",
    image: user.image ?? null,
  };
});

/** Like getViewer, but redirects to sign-in when nobody is signed in. */
export async function requireViewer(returnTo?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in");
  }
  return viewer;
}
