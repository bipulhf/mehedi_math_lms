/**
 * `jest-expo` stubs the Expo native modules, but three of them need behaviour
 * rather than a stub because the code under test reads what they return.
 */

// The session cookie lives in the keychain on a device. In a test it lives in
// this map, so `session-store.ts` can be exercised for real rather than mocked
// at its own boundary.
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();

  return {
    __store: store,
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    })
  };
});

// The persisted query cache is a native module. Its own package ships a mock
// for exactly this, and `query.ts` reads it at import time.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-linking", () => ({
  createURL: jest.fn((path: string) => `mma://${path}`)
}));

jest.mock("expo-web-browser", () => ({
  dismissBrowser: jest.fn(async () => undefined),
  openAuthSessionAsync: jest.fn(async () => ({ type: "dismiss" })),
  openBrowserAsync: jest.fn(async () => ({ type: "opened" })),
  // Kept from the real module: tests assert on these members, and a mock that
  // dropped them would fail for a reason that has nothing to do with the code.
  WebBrowserResultType: {
    CANCEL: "cancel",
    DISMISS: "dismiss",
    LOCKED: "locked",
    OPENED: "opened"
  }
}));

/**
 * `expo-image` 57.0.2 wires itself into the `expo-observe` oversized-image
 * integration at import time. jest-expo's stub for the `ExpoObserve` native
 * module predates it and does not expose `getIntegrations`, so the wiring
 * throws before any component renders. Add the member it calls. This runs at
 * setup, before any test module — and therefore before `expo-image` evaluates.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.setup.ts is CJS-style setup, no import form is evaluated before expo-image
const observeModule = require("expo-modules-core").NativeModulesProxy
  .ExpoObserve as Record<string, unknown> | undefined;
if (observeModule) {
  observeModule.getIntegrations = jest.fn(() => ({}));
}

/**
 * Reanimated's UI-thread runtime does not exist under Jest, and its own
 * `mock` entry point still loads the native worklets initialiser. Only the
 * handful of members `SkeletonBlock` uses are stubbed, each reduced to the
 * still frame it would animate from — the pulse is not what any test asserts on.
 */
jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: { View },
    Easing: { inOut: () => undefined, quad: undefined },
    useAnimatedStyle: (factory: () => Record<string, unknown>) => factory(),
    useSharedValue: (initial: unknown) => ({ value: initial }),
    withRepeat: (animation: unknown) => animation,
    withTiming: (toValue: unknown) => toValue
  };
});
