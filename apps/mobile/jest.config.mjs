/**
 * `bun test` cannot run this workspace: it has no React Native renderer, and
 * the value here is in the screens. `jest-expo` is the preset that knows how to
 * transform the Expo module graph and stub the native side of it.
 *
 * @type {import("jest").Config}
 */
export default {
  preset: "jest-expo",
  // `@/…` is the path alias the app is written against; without this every
  // import in every module under test fails to resolve.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"]
};
