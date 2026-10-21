/**
 * @file vite.config.ts
 * @description Cloudflare Pages / Remix 向け（rollupOptions による CommonJS 対策版）
 */
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      ssr: true,
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
  ssr: {
    target: "webworker",
    noExternal: true,
  },
  // 💡 追加: バンドル時の CommonJS 変換・グローバル変数補正を Rollup レベルで行う
  build: {
    rollupOptions: {
      output: {
        format: "esm",
      },
    },
  },
});