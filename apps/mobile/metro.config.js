// Learn more https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

/**
 * `@mma/shared` is consumed unbuilt — its package `exports` point at `.ts`
 * source. Metro will not leave the app directory or compile TypeScript from
 * another package unless it is told to, so both are configured here.
 */
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];
// Hoisting is on (see bunfig.toml), so a package resolved from the workspace
// root is the same copy the app would find locally. Without this, React and the
// native modules can be loaded twice.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
