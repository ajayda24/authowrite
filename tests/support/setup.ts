import { beforeEach, vi } from "vitest";

vi.mock("@/server/db", async () => {
  const { getTestDb } = await import("./test-db");
  const schema = await import("@/server/db/schema");
  return { db: await getTestDb(), schema };
});

beforeEach(async () => {
  const { resetDb } = await import("./test-db");
  await resetDb();
});
