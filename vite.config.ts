/**
 * @file vite.config.ts
 * @description Cloudflare Pages / Remix 向け（rollupOptions による CommonJS & node:crypto 対策版）
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
    // 💡 追加: SSR時にも node:crypto をバンドル対象外にする
    external: ["node:crypto", "crypto"],
  },
  build: {
    rollupOptions: {
      // 💡 追加: Cloudflare Workers のランタイム (nodejs_compat) に任せるため、node:crypto を外部化
      external: ["node:crypto", "crypto"],
      output: {
        format: "esm",
      },
    },
  },
});