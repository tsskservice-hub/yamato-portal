/**
 * @file vite.config.ts
 * @description Cloudflare Pages / Remix 向け（ローカル開発と本番ビルドの条件分岐対応版）
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
    // 💡 ローカル開発時（dev）と本番ビルド時（build）でSSR設定を切り替える
    ssr: {
      target: isProduction ? "webworker" : "node",
      noExternal: true,
      external: isProduction ? ["node:crypto", "crypto"] : [],
    },
    build: {
      rollupOptions: {
        external: isProduction ? ["node:crypto", "crypto"] : [],
        output: {
          format: "esm",
        },
      },
    },
  };
});