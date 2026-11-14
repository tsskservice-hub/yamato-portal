/**
 * @file print-report.tsx
 * @description 印刷（PDF 出力）用の空ページ。FeedbackPdfModal がこのページを新しいタブで開き、
 * 読み込み後にレポートの HTML を書き込んで印刷する。
 * about:blank ではなくサイト内の実在 URL にすることで、タブにサイトのアイコンが表示される。
 */
import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => [
  { title: "Preparing report..." },
  { name: "robots", content: "noindex, nofollow" },
];

export default function PrintReport() {
  return null;
}
