import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [tanstackStart(), viteReact(), tailwindcss()],
  resolve: {
    tsconfigPaths: true
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        changeOrigin: true,
        target: "http://localhost:3001"
      }
    }
  }
});
