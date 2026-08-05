import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, loadEnv } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig(({ command, mode }) => {
  // What is being built decides this, never the environment file. Bun loads the
  // root `.env` into `process.env` before Vite is even imported, so
  // `NODE_ENV=development` there -- which is right for `bun run dev` and for the
  // API -- was making `bun run build` emit the *development* React: the dev JSX
  // runtime, the dev warnings, none of the minification that matters. That
  // bundle then crashed with "jsxDEV is not a function" the moment the built
  // server was started the way production starts it.
  process.env.NODE_ENV = command === "build" ? "production" : "development";

  for (const [key, value] of Object.entries(loadEnv(mode, repoRoot, ""))) {
    if (key === "NODE_ENV") {
      continue;
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [tanstackStart(), viteReact(), tailwindcss()],
    envDir: repoRoot,
    resolve: {
      tsconfigPaths: true
    },
    server: {
      port: 3000,
      // Packages are consumed as TypeScript source, so Vite follows the
      // node_modules/@genex/* symlinks out into packages/ and watches real
      // files there — which is what makes a package edit hot-reload. What it
      // must not do is descend into build output and caches on the way: those
      // are thousands of files that never trigger a useful reload, and on
      // Linux every one of them costs an inotify watch.
      watch: {
        ignored: [
          "**/node_modules/**",
          "**/dist/**",
          "**/.turbo/**",
          "**/.git/**",
          "**/test-results/**",
          "**/playwright-report/**",
          "**/coverage/**",
          path.join(repoRoot, "design_handoff_genex/**"),
          path.join(repoRoot, "apps/mobile/**")
        ]
      },
      proxy: {
        // `ws` is what carries `/api/v1/messages/ws` and `/api/v1/notifications/ws`
        // through to the API. Without it the upgrade request is answered by the
        // dev server itself, every socket fails to open, and the messages page
        // silently degrades to "reload to see new messages".
        "/api/v1": {
          changeOrigin: true,
          target: "http://localhost:3001",
          ws: true
        },
        "/api/health": {
          changeOrigin: true,
          target: "http://localhost:3001"
        },
        "/robots.txt": {
          changeOrigin: true,
          target: "http://localhost:3001"
        },
        "/sitemap.xml": {
          changeOrigin: true,
          target: "http://localhost:3001"
        }
      }
    }
  };
});
