import { nanoid } from "nanoid";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export async function createUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const id = overrides.id ?? nanoid();
  const username =
    overrides.username ??
    `user${id
      .slice(0, 6)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "x")}`;
  const [user] = await db
    .insert(users)
    .values({
      id,
      name: overrides.name ?? "Test Writer",
      email: overrides.email ?? `${id}@example.com`,
      username,
      displayUsername: username,
      ...overrides,
    })
    .returning();
  return user;
}

export function doc(...paragraphs: string[]) {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
  };
}
