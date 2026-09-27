import "server-only";
import { DomainError } from "@/server/services/errors";
import { RateLimitError } from "@/server/rate-limit";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; code?: number };

/**
 * Runs a service call for a server action and converts domain errors into a
 * serializable result the UI can show. Unexpected errors are logged and
 * reported generically.
 */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data } as ActionResult<T>;
  } catch (error) {
    if (error instanceof DomainError)
      return { ok: false, error: error.message, code: error.status };
    if (error instanceof RateLimitError) return { ok: false, error: error.message, code: 429 };
    // redirect()/notFound() throw special errors that must propagate.
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("[action] unexpected error", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
