/**
 * @file developerOnly.ts
 * @description 開発者用テストページを本番サイトで非公開にするためのヘルパー
 *
 * 本番ドメイン（jptutoraiyamato.com）へのアクセスでは 404 を返す。
 * プレビュー（*.pages.dev）とローカル（localhost）ではそのまま表示される。
 * 使い方: 各 developer.* ページの loader の先頭で blockOnProduction(request) を呼ぶ。
 */

export const PRODUCTION_HOSTS = ["jptutoraiyamato.com", "www.jptutoraiyamato.com"];

/** 本番ドメインかどうか（プレビュー *.pages.dev・localhost は false） */
export function isProductionHost(hostname: string): boolean {
  return PRODUCTION_HOSTS.includes(hostname);
}

export function blockOnProduction(request: Request): void {
  const host = new URL(request.url).hostname;
  if (isProductionHost(host)) {
    throw new Response("Not Found", { status: 404 });
  }
}
