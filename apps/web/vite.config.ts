import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, loadEnv } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig(({ mode }) => {
  for (const [key, value] of Object.entries(loadEnv(mode, repoRoot, ""))) {
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
      proxy: {
        "/api/v1": {
          changeOrigin: true,
          target: "http://localhost:3001"
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
