/**
 * @file vite.config.ts
 * @description Cloudflare Pages / Remix 向け正しい Vite 設定
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
    // 💡 noExternal を削除し、外部モジュールとして正しく扱うことで node:stream のバンドルエラーを防ぐ
  },
});