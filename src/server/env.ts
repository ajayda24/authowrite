import "server-only";
import { parseEnv, type Env } from "./config";

export { ConfigError, parseEnv, type Env } from "./config";

let cached: Env | null = null;

/** Validated configuration, parsed on first use (not at import or build time). */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/** Lazily-validated configuration object. Reading any field triggers validation. */
export const env = new Proxy({} as Env, {
  get: (_target, key) => getEnv()[key as keyof Env],
});
