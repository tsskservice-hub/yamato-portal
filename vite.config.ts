/**
 * @file vite.config.ts
 * @description Cloudflare Pages / Remix 向け安定版 Vite 設定
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
    noExternal: true, // Cloudflare Workers 環境で依存関係をバンドル内に正しく取り込む設定
  },
  resolve: {
    mainFields: ["browser", "module", "main"],
  },
});