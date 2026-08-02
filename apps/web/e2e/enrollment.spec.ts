import { expect, test } from "@playwright/test";

/**
 * Enrollment is one of the two flows the build plan named for end-to-end
 * coverage, and one of the two that move money.
 *
 * The API-level assertions run everywhere: they check that the enrolment
 * endpoints refuse an anonymous caller, which is the property that must never
 * regress. The UI assertions need a published course, so they read the public
 * catalogue first and skip with a reason when the environment has none —
 * a skip that names its cause rather than a green tick over nothing.
 */

/** See auth-gating.spec.ts: the dashboard chunk compiles on first navigation. */
const GUARD_REDIRECT_TIMEOUT_MS = 45_000;

interface CatalogueCourse {
  price: string;
  slug: string;
  title: string;
}

async function firstPublishedCourse(
  request: import("@playwright/test").APIRequestContext
): Promise<CatalogueCourse | null> {
  const response = await request.get("/api/v1/courses?status=PUBLISHED&limit=1");

  if (!response.ok()) {
    return null;
  }

  const body = (await response.json()) as { data?: readonly CatalogueCourse[] };

  return body.data?.[0] ?? null;
}

test.describe("enrolment endpoints refuse an anonymous caller", () => {
  test("creating an enrolment is rejected", async ({ request }) => {
    const response = await request.post("/api/v1/enrollments", {
      data: { courseId: "11111111-1111-4111-8111-111111111111" }
    });

    expect(response.status()).toBe(401);
    expect((await response.json()).status).toBe("error");
  });

  test("listing my enrolments is rejected", async ({ request }) => {
    const response = await request.get("/api/v1/enrollments/me");

    expect(response.status()).toBe(401);
  });

  test("a certificate cannot be pulled without a session", async ({ request }) => {
    const response = await request.get(
      "/api/v1/enrollments/11111111-1111-4111-8111-111111111111/certificate"
    );

    expect(response.status()).toBe(401);
  });
});

test.describe("the enrolment call to action", () => {
  test("an anonymous visitor is sent to sign-up carrying the course", async ({ page, request }) => {
    const course = await firstPublishedCourse(request);

    test.skip(course === null, "No published course in this environment to enrol in.");

    await page.goto(`/courses/${course?.slug ?? ""}`);

    const enroll = page.getByRole("link", { name: /enroll/i }).first();

    await expect(enroll).toBeVisible({ timeout: 15_000 });
    await enroll.click();

    // The course must survive the detour through sign-up, or the visitor comes
    // back to a catalogue and has to find it again.
    await expect(page).toHaveURL(/\/auth\/sign-up\?.*courseSlug=/, { timeout: 15_000 });
    expect(new URL(page.url()).searchParams.get("courseSlug")).toBe(course?.slug);
  });

  test("the sign-up page renders with the course in hand", async ({ page, request }) => {
    const course = await firstPublishedCourse(request);

    test.skip(course === null, "No published course in this environment to enrol in.");

    await page.goto(`/auth/sign-up?courseSlug=${course?.slug ?? ""}`);

    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page).toHaveURL(/courseSlug=/);
  });
});

test.describe("the student's enrolment surface is gated", () => {
  for (const route of ["/dashboard/my-courses", "/dashboard/payments"] as const) {
    test(`${route} sends an anonymous visitor to sign-in`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: GUARD_REDIRECT_TIMEOUT_MS });
    });
  }
});
