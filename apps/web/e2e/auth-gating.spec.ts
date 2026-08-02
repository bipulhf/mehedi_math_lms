import { expect, test } from "@playwright/test";

/**
 * The dashboard guard is client-side by design -- the API is what actually
 * enforces authorization. These tests check the redirect, not the security:
 * an anonymous visitor should land on sign-in rather than on a broken shell
 * making 401 requests in a loop.
 */

const guardedRoutes = [
  "/dashboard",
  "/dashboard/my-courses",
  "/dashboard/messages",
  "/dashboard/admin/message-reports"
] as const;

test.describe("dashboard is gated", () => {
  for (const route of guardedRoutes) {
    test(`${route} sends an anonymous visitor to sign-in`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });
    });
  }
});

test.describe("sign-in", () => {
  test("the form is present and refuses an empty submission", async ({ page }) => {
    await page.goto("/auth/sign-in");

    const email = page.getByLabel(/email/i).first();
    const password = page.getByLabel(/password/i).first();

    await expect(email).toBeVisible();
    await expect(password).toBeVisible();

    await page.getByRole("button", { name: /sign in/i }).first().click();

    // Client-side validation, so we stay put rather than round-tripping.
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("sign-up is reachable from sign-in", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.getByRole("link", { name: /sign up|create/i }).first().click();

    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });
});
