import { expect, test } from "@playwright/test";

for (const path of ["/", "/explore", "/about", "/sign-in"]) {
  test(`${path} has no horizontal overflow on small screens`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("mobile navigation opens", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Explore" })).toBeVisible();
});
