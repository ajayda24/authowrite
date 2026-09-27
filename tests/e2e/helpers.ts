import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export function uniqueUser(prefix: string) {
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  return {
    name: `${prefix} Tester`,
    username: `${prefix}${id}`.slice(0, 28),
    email: `${prefix}-${id}@example.test`,
    password: "correct horse battery",
  };
}

export async function signUp(page: Page, user: ReturnType<typeof uniqueUser>, next?: string) {
  await page.goto(next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up");
  await page.getByLabel("Your name").fill(user.name);
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(next ? `**${next}` : "**/dashboard");
}

export async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}
