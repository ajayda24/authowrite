import "server-only";
import { notFound, redirect } from "next/navigation";
import { DomainError } from "./errors";

/**
 * Converts domain errors from a page-level service call into Next.js
 * navigation: unauthenticated → sign in, forbidden/missing → 404 (so we
 * don't reveal whether a private resource exists).
 */
export async function loadOr404<T>(fn: () => Promise<T>, returnTo?: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DomainError) {
      if (error.status === 401) redirect(returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in");
      if (error.status === 403 || error.status === 404) notFound();
    }
    throw error;
  }
}
