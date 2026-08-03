import { resolveOrigins } from "@/src/lib/env";

/**
 * The origin resolver has three branches, and the app is unusable on exactly
 * one target if any of them is wrong — which is the failure mode hardest to
 * notice, because the other target keeps working.
 */

const NOTHING_CONFIGURED = {
  configuredApiOrigin: undefined,
  configuredWebOrigin: undefined
} as const;

describe("resolveOrigins", () => {
  test("a configured origin wins, and a trailing slash does not double up", () => {
    expect(
      resolveOrigins({
        configuredApiOrigin: "https://api.genex.test/",
        configuredWebOrigin: "https://genex.test/",
        devHost: "192.168.0.9",
        platform: "ios"
      })
    ).toEqual({ apiOrigin: "https://api.genex.test", webOrigin: "https://genex.test" });
  });

  test("a device takes the host from the Metro connection, not from localhost", () => {
    // `localhost` on a phone is the phone. Getting this wrong makes every
    // request time out on device while the emulator keeps working.
    expect(
      resolveOrigins({ ...NOTHING_CONFIGURED, devHost: "192.168.0.9", platform: "android" })
    ).toEqual({ apiOrigin: "http://192.168.0.9:3001", webOrigin: "http://192.168.0.9:3000" });
  });

  test("the Android emulator falls back to 10.0.2.2, which is how it reaches the host", () => {
    expect(resolveOrigins({ ...NOTHING_CONFIGURED, devHost: null, platform: "android" })).toEqual({
      apiOrigin: "http://10.0.2.2:3001",
      webOrigin: "http://10.0.2.2:3000"
    });
  });

  test("every other platform falls back to the loopback address", () => {
    expect(resolveOrigins({ ...NOTHING_CONFIGURED, devHost: null, platform: "ios" })).toEqual({
      apiOrigin: "http://127.0.0.1:3001",
      webOrigin: "http://127.0.0.1:3000"
    });
  });

  test("an empty configured value is treated as unset, not as an origin", () => {
    expect(
      resolveOrigins({
        configuredApiOrigin: "",
        configuredWebOrigin: "",
        devHost: "192.168.0.9",
        platform: "android"
      }).apiOrigin
    ).toBe("http://192.168.0.9:3001");
  });

  test("the API and the web app are on different ports, and auth belongs to the web one", () => {
    const origins = resolveOrigins({
      ...NOTHING_CONFIGURED,
      devHost: "192.168.0.9",
      platform: "ios"
    });

    expect(origins.apiOrigin).not.toBe(origins.webOrigin);
  });
});
