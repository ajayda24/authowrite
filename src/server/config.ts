/**
 * Configuration parsing. Pure and dependency-light so it can run in tests and
 * in the startup hook (src/instrumentation.ts). App code uses `env` from ./env.
 */
import { z } from "zod";

/** Blank values ("" or whitespace) count as unset, so defaults apply. */
const optional = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().optional(),
);

const schema = z.object({
  NODE_ENV: optional,
  APP_URL: optional,
  VERCEL: optional,
  VERCEL_URL: optional,
  VERCEL_PROJECT_PRODUCTION_URL: optional,
  DATABASE_URL: optional,
  BETTER_AUTH_SECRET: optional,

  STORAGE_DRIVER: optional,
  STORAGE_LOCAL_DIR: optional,
  S3_ENDPOINT: optional,
  S3_REGION: optional,
  S3_BUCKET: optional,
  S3_ACCESS_KEY_ID: optional,
  S3_SECRET_ACCESS_KEY: optional,
  S3_FORCE_PATH_STYLE: optional,

  SMTP_URL: optional,
  MAIL_FROM: optional,

  GITHUB_CLIENT_ID: optional,
  GITHUB_CLIENT_SECRET: optional,
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
});

export class ConfigError extends Error {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
    this.name = "ConfigError";
  }
}

function withScheme(url: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

function resolveAppUrl(raw: z.infer<typeof schema>): string {
  const candidate =
    raw.APP_URL ?? raw.VERCEL_PROJECT_PRODUCTION_URL ?? raw.VERCEL_URL ?? "http://localhost:3000";
  const url = withScheme(candidate).replace(/\/+$/, "");
  try {
    new URL(url);
  } catch {
    throw new ConfigError(
      `APP_URL "${raw.APP_URL}" is not a valid URL, e.g. https://stories.example.org`,
    );
  }
  return url;
}

/**
 * Parses and validates configuration from an environment object. Pure, so it
 * can be tested; the app uses the cached `env` below.
 */
export function parseEnv(source: Record<string, string | undefined>) {
  const raw = schema.parse(source);
  // `next build` imports server modules to analyse routes, but never serves
  // requests, so run-time-only requirements (like the auth secret) are
  // checked when the app starts instead.
  const building = source.NEXT_PHASE === "phase-production-build";
  const nodeEnv =
    raw.NODE_ENV === "production" || raw.NODE_ENV === "test" ? raw.NODE_ENV : "development";
  const isProduction = nodeEnv === "production";
  const onVercel = Boolean(raw.VERCEL);

  const secret = raw.BETTER_AUTH_SECRET;
  if (secret && secret.length < 16) {
    throw new ConfigError(
      "BETTER_AUTH_SECRET must be at least 16 characters. Generate one with: openssl rand -base64 32",
    );
  }
  if (!secret && isProduction && !building) {
    throw new ConfigError(
      "BETTER_AUTH_SECRET is not set. Generate one with: openssl rand -base64 32",
    );
  }

  const driver = (raw.STORAGE_DRIVER ?? "local").toLowerCase();
  if (driver !== "local" && driver !== "s3") {
    throw new ConfigError(
      `STORAGE_DRIVER must be "local" or "s3" (got "${raw.STORAGE_DRIVER}"). Leave it unset for local disk.`,
    );
  }
  if (driver === "local" && onVercel && !building) {
    console.warn(
      "[config] STORAGE_DRIVER=local on Vercel: uploaded images will not persist. " +
        "Set STORAGE_DRIVER=s3 and the S3_* variables (see docs/self-hosting.md).",
    );
  }

  const forcePathStyle = (raw.S3_FORCE_PATH_STYLE ?? "true").toLowerCase();
  if (forcePathStyle !== "true" && forcePathStyle !== "false") {
    throw new ConfigError('S3_FORCE_PATH_STYLE must be "true" or "false".');
  }

  return {
    NODE_ENV: nodeEnv as "development" | "test" | "production",
    APP_URL: resolveAppUrl(raw),
    DATABASE_URL: raw.DATABASE_URL ?? "postgres://authowrite:authowrite@localhost:5432/authowrite",
    BETTER_AUTH_SECRET: secret,

    STORAGE_DRIVER: driver as "local" | "s3",
    STORAGE_LOCAL_DIR: raw.STORAGE_LOCAL_DIR ?? "./storage",
    S3_ENDPOINT: raw.S3_ENDPOINT,
    S3_REGION: raw.S3_REGION ?? "us-east-1",
    S3_BUCKET: raw.S3_BUCKET,
    S3_ACCESS_KEY_ID: raw.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: raw.S3_SECRET_ACCESS_KEY,
    S3_FORCE_PATH_STYLE: forcePathStyle === "true",

    SMTP_URL: raw.SMTP_URL,
    MAIL_FROM: raw.MAIL_FROM ?? "Authowrite <no-reply@localhost>",

    GITHUB_CLIENT_ID: raw.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: raw.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: raw.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: raw.GOOGLE_CLIENT_SECRET,
  };
}

export type Env = ReturnType<typeof parseEnv>;
