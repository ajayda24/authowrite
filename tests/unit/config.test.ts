import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigError, parseEnv } from "@/server/config";

const SECRET = "a-long-enough-secret-value";

afterEach(() => vi.restoreAllMocks());

describe("parseEnv", () => {
  it("treats blank values as unset so defaults apply", () => {
    const env = parseEnv({
      APP_URL: "",
      STORAGE_DRIVER: " ",
      BETTER_AUTH_SECRET: "",
      S3_REGION: "",
    });
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.STORAGE_DRIVER).toBe("local");
    expect(env.S3_REGION).toBe("us-east-1");
    expect(env.BETTER_AUTH_SECRET).toBeUndefined();
  });

  it("falls back to the Vercel URL and adds a scheme", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseEnv({ VERCEL: "1", VERCEL_URL: "authowrite-abc.vercel.app" }).APP_URL).toBe(
      "https://authowrite-abc.vercel.app",
    );
    expect(
      parseEnv({
        VERCEL_PROJECT_PRODUCTION_URL: "authowrite.vercel.app",
        VERCEL_URL: "authowrite-abc.vercel.app",
      }).APP_URL,
    ).toBe("https://authowrite.vercel.app");
    expect(parseEnv({ APP_URL: "stories.example.org/" }).APP_URL).toBe(
      "https://stories.example.org",
    );
  });

  it("requires a secret in production, but not while building", () => {
    expect(() => parseEnv({ NODE_ENV: "production" })).toThrow(ConfigError);
    expect(() => parseEnv({ NODE_ENV: "production" })).toThrow(/openssl rand/);
    expect(() =>
      parseEnv({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" }),
    ).not.toThrow();
    expect(parseEnv({ NODE_ENV: "production", BETTER_AUTH_SECRET: SECRET }).NODE_ENV).toBe(
      "production",
    );
  });

  it("rejects a short secret with a helpful message", () => {
    expect(() => parseEnv({ BETTER_AUTH_SECRET: "short" })).toThrow(/at least 16 characters/);
  });

  it("explains invalid storage drivers", () => {
    expect(() => parseEnv({ STORAGE_DRIVER: "blob" })).toThrow(/"local" or "s3"/);
    expect(parseEnv({ STORAGE_DRIVER: "S3" }).STORAGE_DRIVER).toBe("s3");
  });

  it("warns when local storage is used on Vercel", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    parseEnv({ VERCEL: "1", BETTER_AUTH_SECRET: SECRET });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("will not persist"));
  });

  it("parses S3 path style", () => {
    expect(parseEnv({}).S3_FORCE_PATH_STYLE).toBe(true);
    expect(parseEnv({ S3_FORCE_PATH_STYLE: "false" }).S3_FORCE_PATH_STYLE).toBe(false);
    expect(() => parseEnv({ S3_FORCE_PATH_STYLE: "yes" })).toThrow(ConfigError);
  });
});
