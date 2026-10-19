/**
 * @file entry.server.tsx
 * @description Cloudflare Workers / Pages 向けの安全なサーバーエントリ（CommonJS/ESM互換対応版）
 */
import type { AppLoadContext, EntryContext } from "@remix-run/cloudflare";
import { RemixServer } from "@remix-run/react";
import ReactDOMServer from "react-dom/server";

export const streamTimeout = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), streamTimeout);

  try {
    // 💡 デフォルトインポート経由で安全に renderToReadableStream を呼び出す
    const body = await ReactDOMServer.renderToReadableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        signal: controller.signal,
        onError(error: unknown) {
          console.error(error);
          responseStatusCode = 500;
        },
      }
    );

    clearTimeout(timeoutId);

    responseHeaders.set("Content-Type", "text/html; charset=utf-8");
    return new Response(body, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}