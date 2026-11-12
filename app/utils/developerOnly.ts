/**
 * @file developerOnly.ts
 * @description 開発者用テストページを本番サイトで非公開にするためのヘルパー
 *
 * 本番ドメイン（jptutoraiyamato.com）へのアクセスでは 404 を返す。
 * プレビュー（*.pages.dev）とローカル（localhost）ではそのまま表示される。
 * 使い方: 各 developer.* ページの loader の先頭で blockOnProduction(request) を呼ぶ。
 */

const PRODUCTION_HOSTS = ["jptutoraiyamato.com", "www.jptutoraiyamato.com"];

export function blockOnProduction(request: Request): void {
  const host = new URL(request.url).hostname;
  if (PRODUCTION_HOSTS.includes(host)) {
    throw new Response("Not Found", { status: 404 });
  }
}
