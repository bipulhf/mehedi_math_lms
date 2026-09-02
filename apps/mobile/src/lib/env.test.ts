import { resolveOrigins } from "@/src/lib/env";

/**
 * The deployed defaults keep Expo Go and release builds on the same services.
 * Local services are available only through explicit public configuration.
 */

const NOTHING_CONFIGURED = {
  configuredApiOrigin: undefined,
  configuredWebOrigin: undefined
} as const;

describe("resolveOrigins", () => {
  test("a configured origin wins, and a trailing slash does not double up", () => {
    expect(
      resolveOrigins({
        configuredApiOrigin: "https://api.mma.test/",
        configuredWebOrigin: "https://mma.test/"
      })
    ).toEqual({ apiOrigin: "https://api.mma.test", webOrigin: "https://mma.test" });
  });

  test("the deployed API and web origins are used when none are configured", () => {
    expect(resolveOrigins(NOTHING_CONFIGURED)).toEqual({
      apiOrigin: "https://api.lms.mehedismathacademy.com",
      webOrigin: "https://lms.mehedismathacademy.com"
    });
  });

  test("an empty configured value is treated as unset, not as an origin", () => {
    expect(
      resolveOrigins({
        configuredApiOrigin: "",
        configuredWebOrigin: ""
      }).apiOrigin
    ).toBe("https://api.lms.mehedismathacademy.com");
  });

  test("the API and the web app are on different ports, and auth belongs to the web one", () => {
    const origins = resolveOrigins(NOTHING_CONFIGURED);

    expect(origins.apiOrigin).not.toBe(origins.webOrigin);
  });
});
