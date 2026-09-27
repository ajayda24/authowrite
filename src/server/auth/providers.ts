import "server-only";
import { env } from "@/server/env";

/** Social sign-in providers enabled on this instance. */
export function enabledProviders(): string[] {
  const providers: string[] = [];
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) providers.push("github");
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) providers.push("google");
  return providers;
}
