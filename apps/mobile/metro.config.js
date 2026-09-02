// Learn more https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const sharedSourceFolders = [
  path.resolve(workspaceRoot, "packages/i18n"),
  path.resolve(workspaceRoot, "packages/shared")
];

const config = getDefaultConfig(projectRoot);

/**
 * `@mma/shared` is consumed unbuilt — its package `exports` point at `.ts`
 * source, as does `@mma/i18n`. Metro must watch both packages, but watching
 * the workspace root also recursively watches its hoisted `node_modules`.
 * That uses tens of thousands of Linux inotify watches before Metro can start.
 */
config.watchFolders = sharedSourceFolders;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];
// Hoisting is on (see bunfig.toml), so a package resolved from the workspace
// root is the same copy the app would find locally. Without this, React and the
// native modules can be loaded twice.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
