/**
 * @file KanjiLookup.tsx
 * @description 漢字AI検索（どのページにも出す。root.tsx に置いている）
 *
 * 使い方は 2 つ:
 *   1. ページの日本語をなぞって選ぶ → すぐ上に「🔍 Reading」が出る → 押すと読みが出る（コピペ不要）
 *   2. 左下の「🔍 Kanji」ボタン → パネルに言葉を入力・貼り付けして調べる
 * 選んだ言葉の前後の文も一緒に送るので、文に合った読みが出る（今日 → きょう／こんにち）。
 * 「VCE の漢字かどうか」は AI ではなく VCE の漢字の一覧で判定する。
 * 色は、そのページのヤマトチャットの色に合わせる（utils/chatThemeColor.ts）。
 * 料金: ログインしている人は 1 日 20 回まで無料、それを超えたら 1 回 1 クレジット。ログインしていない人は 1 日 3 回まで。
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "@remix-run/react";
import { yamatoFetch, YAMATO_API_BASE } from "~/lib/yamatoApi";
import { VCE_KANJI_LIST } from "~/data/kanji-list";
import { CREDIT_COSTS } from "~/data/credit-costs";
import { useChatColor } from "~/utils/chatThemeColor";
import { requestAuthModal } from "~/utils/openAuthModal";

const DEFAULT_COLOR = "#dc2626"; // ヤマトチャットが無いページの色（LP のヤマトと同じ赤）
const KANJI_RE = /[㐀-䶿一-鿿豈-﫿々]/;
const MAX_QUERY = 30;
/** このボタンを出さないページ（印刷用など） */
const HIDDEN_PATHS = ["/print-report"];

interface LookupWord {
  word: string;
  reading: string;
  romaji: string;
  meaning: string;
}
interface Quota {
  remainingFree: number;
  freeLimit: number;
  signedIn: boolean;
  free?: boolean;
}

/** 選んだ範囲の文字（ふりがな <rt> は除く） */
function textWithoutRuby(node: Node | DocumentFragment): string {
  const clone = node.cloneNode(true) as Element | DocumentFragment;
  if ("querySelectorAll" in clone) clone.querySelectorAll("rt, rp").forEach((n) => n.remove());
  return (clone.textContent || "").replace(/\s+/g, " ");
}

export default function KanjiLookup() {
  const location = useLocation();
  const chatColor = useChatColor();
  const color = chatColor || DEFAULT_COLOR;
  const vceSet = useMemo(() => new Set(VCE_KANJI_LIST), []);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<LookupWord[] | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  // なぞって選んだ言葉のすぐ上に出す「🔍 Reading」
  const [chip, setChip] = useState<{ text: string; context: string; top: number; left: number } | null>(null);

  const hidden = HIDDEN_PATHS.some((p) => location.pathname.startsWith(p));

  // ---- なぞって選んだ言葉を見つける ----
  useEffect(() => {
    if (hidden) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const update = () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && rootRef.current?.contains(active)) return setChip(null);

      let text = "";
      let context = "";
      let rect: DOMRect | null = null;

      const isField =
        active &&
        (active.tagName === "TEXTAREA" ||
          (active.tagName === "INPUT" && ["text", "search", ""].includes((active as HTMLInputElement).type)));
      if (isField) {
        // 入力欄の中で選んだとき（答えの欄など）
        const el = active as HTMLTextAreaElement | HTMLInputElement;
        const s = el.selectionStart ?? 0;
        const e = el.selectionEnd ?? 0;
        if (e > s) {
          text = el.value.slice(s, e);
          context = el.value.slice(Math.max(0, s - 50), e + 50);
          rect = el.getBoundingClientRect();
        }
      } else {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          if (rootRef.current?.contains(range.commonAncestorContainer)) return setChip(null);
          text = textWithoutRuby(range.cloneContents());
          const container =
            range.commonAncestorContainer.nodeType === Node.TEXT_NODE
              ? range.commonAncestorContainer.parentElement
              : (range.commonAncestorContainer as Element);
          const full = container ? textWithoutRuby(container) : text;
          const i = full.indexOf(text.trim());
          context = i >= 0 ? full.slice(Math.max(0, i - 50), i + text.trim().length + 50) : text;
          rect = range.getBoundingClientRect();
        }
      }

      text = text.trim();
      if (!text || text.length > MAX_QUERY || !KANJI_RE.test(text) || !rect) return setChip(null);
      const top = rect.top > 56 ? rect.top - 44 : rect.bottom + 8;
      const left = Math.min(Math.max(rect.left + rect.width / 2, 70), window.innerWidth - 70);
      setChip({ text, context: context.trim(), top, left });
    };

    const onSelectionChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(update, 250);
    };
    const onScroll = () => setChip(null);
    document.addEventListener("selectionchange", onSelectionChange);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", onScroll);
    };
  }, [hidden]);

  // ページが変わったら閉じる
  useEffect(() => {
    setChip(null);
  }, [location.pathname]);

  // Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const lookUp = async (rawQuery: string, context?: string) => {
    const q = rawQuery.trim().slice(0, MAX_QUERY);
    setQuery(q);
    setWords(null);
    setError(null);
    if (!q) return;
    if (!KANJI_RE.test(q)) {
      setError({ code: "NO_KANJI", message: "Please enter a word that has kanji in it." });
      return;
    }
    setLoading(true);
    try {
      const res = await yamatoFetch(`${YAMATO_API_BASE}/api/kanji-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, context: context || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (typeof data.remainingFree === "number") {
        setQuota({
          remainingFree: data.remainingFree,
          freeLimit: data.freeLimit,
          signedIn: Boolean(data.signedIn),
          free: data.free,
        });
      }
      if (!res.ok) {
        setError({ code: data.error || "ERROR", message: data.message || "Sorry, something went wrong. Please try again." });
        return;
      }
      setWords(Array.isArray(data.words) ? data.words : []);
      // クレジットを使ったときは、ヘッダーの残高を新しくする（PageLayout が受け取る）
      if (data.free === false && typeof data.balance === "number") {
        window.dispatchEvent(new CustomEvent("yamato:credits-updated", { detail: data.balance }));
      }
    } catch {
      setError({ code: "NETWORK", message: "We couldn't connect. Please check your internet and try again." });
    } finally {
      setLoading(false);
    }
  };

  const openFromChip = () => {
    if (!chip) return;
    setOpen(true);
    setChip(null);
    lookUp(chip.text, chip.context);
  };

  const openAuth = () => {
    setOpen(false);
    requestAuthModal("signin");
  };

  if (hidden) return null;

  const nonVceKanji = (word: string) => [...word].filter((ch) => KANJI_RE.test(ch) && !vceSet.has(ch));

  return (
    <div ref={rootRef} className="print:hidden">
      {/* なぞって選んだ言葉の上に出る「🔍 Reading」 */}
      {chip && !open && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={openFromChip}
          className="fixed z-[60] -translate-x-1/2 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-lg cursor-pointer whitespace-nowrap"
          style={{ top: chip.top, left: chip.left, backgroundColor: color }}
        >
          🔍 Reading
        </button>
      )}

      {/* 左下の「🔍 Kanji」ボタン */}
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="fixed bottom-6 left-4 sm:left-6 z-40 flex items-center gap-1.5 px-4 py-3 rounded-full text-white text-sm font-black shadow-lg hover:shadow-xl transition cursor-pointer"
          style={{ backgroundColor: color }}
          aria-label="Kanji reading lookup"
        >
          🔍 Kanji
        </button>
      )}

      {/* パネル */}
      {open && (
        <div
          role="dialog"
          aria-label="Kanji reading lookup"
          className="fixed bottom-6 left-4 sm:left-6 z-[60] w-[calc(100vw-2rem)] max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 overflow-hidden"
          style={{ borderColor: color }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 text-white" style={{ backgroundColor: color }}>
            <span className="text-sm font-black">🔍 Kanji Reading Lookup</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookUp(query);
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={MAX_QUERY}
                placeholder="Paste or type kanji (e.g. 優しい)"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="shrink-0 px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: color }}
              >
                {loading ? "…" : "Look up"}
              </button>
            </form>

            {loading && <p className="text-xs text-slate-500 animate-pulse">Looking it up…</p>}

            {words && words.length > 0 && (
              <ul className="space-y-2.5">
                {words.map((w, i) => {
                  const notVce = nonVceKanji(w.word);
                  return (
                    <li key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
                        {w.word} <span className="text-base font-bold" style={{ color }}>{w.reading}</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{w.romaji}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{w.meaning}</p>
                      {notVce.length > 0 ? (
                        <p className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                          Not on the VCE kanji list: {notVce.join("・")} — you can write it in hiragana ({w.reading}).
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">✓ VCE kanji</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 space-y-2">
                <p>{error.message}</p>
                {error.code === "GUEST_LIMIT" && (
                  <button type="button" onClick={openAuth} className="px-3 py-1.5 rounded-lg text-white font-bold cursor-pointer" style={{ backgroundColor: color }}>
                    Sign in / Sign up
                  </button>
                )}
                {(error.code === "NO_CREDITS" || error.code === "AI_TRIAL_REQUIRED") && (
                  <a href="/prices" className="inline-block px-3 py-1.5 rounded-lg text-white font-bold" style={{ backgroundColor: color }}>
                    See plans
                  </a>
                )}
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              {quota
                ? quota.signedIn
                  ? quota.free === false
                    ? `Used ${CREDIT_COSTS.kanjiLookup} credit (today's free lookups are used up).`
                    : `Free lookups left today: ${quota.remainingFree} / ${quota.freeLimit}`
                  : `Guest: ${quota.remainingFree} / ${quota.freeLimit} free lookups left today. Sign in for ${CREDIT_COSTS.kanjiLookupFreePerDay} a day.`
                : `Tip: select (highlight) Japanese on the page to see its reading. ${CREDIT_COSTS.kanjiLookupFreePerDay} free lookups a day when signed in, then ${CREDIT_COSTS.kanjiLookup} credit each.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
