import { expect, test } from "@playwright/test";

/**
 * The public surface: what a crawler and a first-time visitor see. These
 * assertions deliberately check structure and metadata rather than copy, so a
 * wording change does not fail the suite but a broken route does.
 */

test.describe("public pages", () => {
  test("the landing page renders and carries its organisation metadata", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Mehedi's Math Academy/i);
    await expect(page.getByRole("navigation").first()).toBeVisible();

    const structuredData = page.locator('script[type="application/ld+json"]').first();

    await expect(structuredData).toHaveCount(1);
    expect(JSON.parse((await structuredData.textContent()) ?? "{}")).toHaveProperty("@context");
  });

  test("the catalogue lists courses and filters without a reload", async ({ page }) => {
    await page.goto("/courses");

    // Located by type, not by placeholder: the placeholder is catalogue copy
    // and changes with the locale.
    const search = page.locator('input[type="search"]').first();

    await expect(search).toBeVisible();
    await search.fill("algebra");

    // The filter is client-side over the query cache; the URL must not change.
    await expect(page).toHaveURL(/\/courses$/);
  });

  test("the categories page renders", async ({ page }) => {
    await page.goto("/categories");

    await expect(page.locator("main, body").first()).toBeVisible();
    await expect(page).toHaveTitle(/categor/i);
  });

  test("an unknown route is a 404 rather than a blank page", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");

    expect(response?.status()).toBe(404);
  });
});

test.describe("robots and sitemap", () => {
  test("robots.txt is served on the public origin", async ({ request }) => {
    const response = await request.get("/robots.txt");

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("Sitemap:");
  });

  test("sitemap.xml is served on the public origin", async ({ request }) => {
    const response = await request.get("/sitemap.xml");

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("<urlset");
  });
});
