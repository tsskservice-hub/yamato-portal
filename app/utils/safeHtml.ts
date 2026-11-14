/**
 * @file safeHtml.ts
 * @description dangerouslySetInnerHTML に渡す前に HTML を「消毒」する共通関数（XSS 対策）
 *
 * - 太字・改行・ふりがな（ruby）・色付け（style）・リストなどの表示用タグは残す
 * - <script>、onerror= などのイベント属性、javascript: のリンクは取り除く
 * - サーバー（Cloudflare）でもブラウザでも同じ結果になる（xss ライブラリは DOM 不要）
 *
 * 使い方: <div dangerouslySetInnerHTML={{ __html: safeHtml(text) }} />
 * ※ JSON-LD（<script type="application/ld+json">）は JSON.stringify で作るので対象外
 */
import { FilterXSS, getDefaultWhiteList } from "xss";

const whiteList = getDefaultWhiteList();

// ふりがな（<ruby>漢字<rt>かんじ</rt></ruby>）を許可
whiteList.ruby = [];
whiteList.rt = [];
whiteList.rp = [];

// AI の返事やデータでは style / class による色付けを使うので、すべてのタグで許可する
// （style の中身は xss ライブラリの CSS フィルターで安全なプロパティだけ残る）
for (const tag of Object.keys(whiteList)) {
  const attrs = whiteList[tag] ?? [];
  for (const attr of ["style", "class"]) {
    if (!attrs.includes(attr)) attrs.push(attr);
  }
  whiteList[tag] = attrs;
}

const filter = new FilterXSS({
  whiteList,
  // 許可していないタグは、タグだけ消して中の文字は残す
  stripIgnoreTag: true,
  // <script> と <style> は中身ごと消す
  stripIgnoreTagBody: ["script", "style"],
});

export function safeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return filter.process(String(html));
}

/** HTML として解釈させたくない文字列（利用者が入力した文章など）をエスケープする */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
