/**
 * @file vite.config.ts
 * @description Cloudflare Pages / Remix 向け（jsx-dev-runtime の module is not defined エラー完全解決版）
 */
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => {
  const isProduction = command === "build";

  return {
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
      target: isProduction ? "webworker" : "node",
      noExternal: true,
      // 💡 node_modules 内のReact関連がSSRで正しく処理されるよう、外部化リストから除外
      external: ["node:crypto", "crypto", "cloudflare:workers"],
    },
    // 💡 Vite の依存関係最適化で CommonJS のモジュールを確実にプリバンドルさせる
    optimizeDeps: {
      include: [
        "react",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom",
        "react-dom/server",
      ],
    },
    build: {
      rollupOptions: {
        external: ["node:crypto", "crypto", "cloudflare:workers"],
        output: {
          format: "esm",
        },
      },
    },
  };
});