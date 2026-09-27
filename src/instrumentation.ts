/**
 * Runs once when a server instance starts. Validates configuration up front
 * so a misconfigured deployment fails immediately with a clear message,
 * instead of on the first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { parseEnv } = await import("./server/config");
  parseEnv(process.env);
}
