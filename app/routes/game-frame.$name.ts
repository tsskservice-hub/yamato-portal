/**
 * @file game-frame.$name.ts
 * @description iframe で表示する HTML ゲーム（将棋・囲碁・花札・数独・都道府県パズル・ひらがな神経衰弱）を配信する
 *
 * 以前は public/games/*.html に置いていたため、URL を直接開けば先生のロックを回避できた。
 * 今は app/games/frames/ に置き、このルートが次を確認してから返す:
 *  1. iframe の中で開かれている（Sec-Fetch-Dest。直接開いたら /games へ戻す）
 *  2. URL の t= が /api/game-access の出したチケット（署名つき・10 分で期限切れ）
 *  3. その生徒が今もゲームを遊べる（先生がロックしていない）
 *
 * 返す HTML の <head> には共通の「ブリッジ」を差し込む（下の FRAME_BRIDGE）。
 */
import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { createAdminSupabaseClient } from '~/lib/supabase.server';
import { getGameAccessForUser, verifyGameTicket } from '~/lib/game-access.server';
import shogi from '~/games/frames/shogi.html?raw';
import go from '~/games/frames/go.html?raw';
import hanafuda from '~/games/frames/hanafuda.html?raw';
import kanjiSudoku from '~/games/frames/kanji-sudoku.html?raw';
import hiraganaMemoryMatch from '~/games/frames/hiragana-memory-match.html?raw';
import prefecturePuzzle from '~/games/frames/prefecture-puzzle.html?raw';

const FRAMES: Record<string, string> = {
  shogi,
  go,
  hanafuda,
  'kanji-sudoku': kanjiSudoku,
  'hiragana-memory-match': hiraganaMemoryMatch,
  'prefecture-puzzle': prefecturePuzzle,
};

/**
 * ゲームの HTML に差し込む共通スクリプト（親ページの components/games/GameFrame.tsx と対になる）
 *  - 親ページの外（直接開いた）なら /games へ移動する
 *  - html に yg-embedded クラスを付ける（下の CSS と、ゲーム側の「埋め込み時だけ」の処理の目印）
 *  - ページの高さを親へ知らせる（yamato-game:height）→ 親が iframe の高さを合わせるので、スクロールが二重にならない
 *  - 親から「iframe のうち画面に見えている範囲」を受け取り（yamato-game:viewport）、CSS 変数に入れる
 *    → iframe が縦に長くても、ダイアログ（.overlay / .modal-backdrop）が見えている範囲の中央に出る
 */
const FRAME_BRIDGE = `
<style>
  html.yg-embedded, html.yg-embedded body { min-height: 0 !important; }
  html.yg-embedded .overlay, html.yg-embedded .modal-backdrop {
    top: var(--yg-view-top, 0px) !important;
    bottom: auto !important;
    height: var(--yg-view-h, 100vh) !important;
  }
  html.yg-embedded .overlay > *, html.yg-embedded .modal-backdrop > * {
    max-height: calc(var(--yg-view-h, 100vh) - 32px) !important;
    overflow: auto;
  }
</style>
<script>
(function () {
  if (window.top === window) { location.replace('/games'); return; }
  var root = document.documentElement;
  root.classList.add('yg-embedded');
  var origin = location.origin;
  var lastHeight = 0;
  function report() {
    var h = Math.ceil(root.getBoundingClientRect().height);
    if (h > 0 && Math.abs(h - lastHeight) > 1) {
      lastHeight = h;
      try { window.parent.postMessage({ type: 'yamato-game:height', height: h }, origin); } catch (e) {}
    }
  }
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent || e.origin !== origin) return;
    var d = e.data || {};
    if (d.type === 'yamato-game:viewport' && typeof d.top === 'number' && typeof d.height === 'number') {
      root.style.setProperty('--yg-view-top', Math.max(0, d.top) + 'px');
      root.style.setProperty('--yg-view-h', Math.max(0, d.height) + 'px');
    }
  });
  function start() {
    report();
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(report);
      ro.observe(root);
      if (document.body) ro.observe(document.body);
    }
    window.addEventListener('load', report);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(report);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
</script>`;

const BASE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "frame-ancestors 'self'",
  'Referrer-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow',
};

/** 遊べないときに iframe の中に出す短いページ（親ページ側でもロック画面に切り替わる） */
function messagePage(message: string, status: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Game unavailable</title><style>body{margin:0;font-family:system-ui,sans-serif;background:#f8fafc;color:#334155;display:flex;align-items:center;justify-content:center;min-height:240px;padding:24px;text-align:center}</style>
</head><body><p>${message}</p></body></html>`;
  return new Response(html, { status, headers: BASE_HEADERS });
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const html = FRAMES[params.name ?? ''];
  if (!html) return messagePage('This game could not be found.', 404);

  // iframe ではなく直接開かれた（新しいタブに URL を貼った等）。Sec-Fetch-Dest がない古いブラウザはブリッジが /games へ戻す
  const dest = request.headers.get('Sec-Fetch-Dest');
  if (dest && dest !== 'iframe') throw redirect('/games');

  const userId = await verifyGameTicket(context, new URL(request.url).searchParams.get('t'));
  if (!userId) return messagePage('This game link has expired. Please open the game again from the Games page.', 403);

  const access = await getGameAccessForUser(createAdminSupabaseClient(context), userId);
  if (access.status !== 'allowed') return messagePage('Games are locked by your teacher right now.', 403);

  return new Response(html.replace(/<head>/i, `<head>${FRAME_BRIDGE}`), { headers: BASE_HEADERS });
}
