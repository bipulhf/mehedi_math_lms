import { isLeavingAppState } from "@/src/lib/use-exam-focus-guard";

describe("isLeavingAppState", () => {
  test("backgrounding the app is leaving the exam", () => {
    expect(isLeavingAppState("background")).toBe(true);
  });

  // The notification shade half-pulled, an incoming call banner, the app
  // switcher being peeked at. None of those is a student leaving their paper,
  // and submitting someone's exam because a message arrived is the worse
  // failure of the two.
  test("an inactive frame is not leaving", () => {
    expect(isLeavingAppState("inactive")).toBe(false);
  });

  test("being in the foreground is not leaving", () => {
    expect(isLeavingAppState("active")).toBe(false);
  });
});
