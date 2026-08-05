import { useRouter } from "@tanstack/react-router";
import { HTTPError } from "ky";
import { useEffect } from "react";

/**
 * Send somebody back to their dashboard when a page is not theirs to see.
 *
 * Every course page loads its data with a query and then renders a skeleton
 * until that data arrives. When the API answers 403 or 404 the data never
 * arrives, so the skeleton is what a teacher opening somebody else's course, or
 * a student opening a course they are not enrolled in, sat and looked at — a
 * page that appears to be loading for ever.
 *
 * The toast is already raised by the API client's `afterResponse` hook, so this
 * only has to move them somewhere real. A 401 is left alone: the dashboard
 * route redirects to sign-in, and sending them to a page that immediately
 * bounces them again would lose the sign-in return path.
 */
export function useAccessGuard(errors: readonly (Error | null)[]): void {
  const router = useRouter();
  const isDenied = errors.some(
    (error) =>
      error instanceof HTTPError &&
      (error.response.status === 403 || error.response.status === 404)
  );

  useEffect(() => {
    if (isDenied) {
      void router.navigate({ replace: true, to: "/dashboard" });
    }
  }, [isDenied, router]);
}
