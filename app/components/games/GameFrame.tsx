/**
 * @file GameFrame.tsx
 * @description HTML ゲーム（/game-frame/:name）を iframe で表示する共通部品
 *
 * - 高さ: ゲームが知らせてくる高さ（yamato-game:height）に iframe を合わせる。ページのスクロールだけで遊べ、二重スクロールにならない
 * - ダイアログ: iframe のうち画面に見えている範囲（yamato-game:viewport）をゲームに知らせ、ダイアログをその中央に出させる
 * - 全画面: ツールバーのボタンで、このツールバーと iframe をまとめて全画面にする。
 *   Fullscreen API が使えない・失敗したとき（iPhone など）は、画面いっぱいに広げる表示に切り替える（新しいタブは開かない）
 * - variants: 同じゲームの別バージョン（都道府県パズルの Easy / Hard）。両方読み込んだままにするので、切り替えても進み具合が残る
 *
 * ゲーム側の対になる処理は routes/game-frame.$name.ts の FRAME_BRIDGE。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export type GameVariant = { key: string; label: string; params?: Record<string, string> };

type Props = {
  /** /game-frame/:name の name */
  name: string;
  title: string;
  /** GameAccessGate から受け取るチケット */
  ticket: string;
  variants?: GameVariant[];
  /** ゲームが高さを知らせてくるまでの高さ（px） */
  minHeight?: number;
};

type FullscreenDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => void };

const fullscreenElement = () => {
  const doc = document as FullscreenDoc;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
};

export function GameFrame({ name, title, ticket, variants, minHeight = 560 }: Props) {
  const list = useMemo<GameVariant[]>(() => (variants?.length ? variants : [{ key: 'main', label: title }]), [variants, title]);
  const [active, setActive] = useState(list[0].key);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [nativeFull, setNativeFull] = useState(false);
  const [pseudoFull, setPseudoFull] = useState(false);
  const isFull = nativeFull || pseudoFull;

  const containerRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  // チケットは GameAccessGate が固定しているので、src は読み込み直しにならない
  const srcs = useMemo(() => {
    const out: Record<string, string> = {};
    for (const v of list) out[v.key] = `/game-frame/${name}?${new URLSearchParams({ ...(v.params ?? {}), t: ticket })}`;
    return out;
  }, [list, name, ticket]);

  // ゲームから高さを受け取る（送り元がこのコンポーネントの iframe のときだけ）
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; height?: unknown } | null;
      if (!data || data.type !== 'yamato-game:height') return;
      const key = Object.keys(frameRefs.current).find((k) => frameRefs.current[k]?.contentWindow === e.source);
      const h = Number(data.height);
      if (!key || !Number.isFinite(h) || h <= 0) return;
      const height = Math.min(Math.ceil(h), 20000);
      setHeights((prev) => (prev[key] === height ? prev : { ...prev, [key]: height }));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // iframe のうち画面に見えている範囲をゲームに知らせる（ダイアログを見える位置に出すため）
  const sendViewport = useCallback(() => {
    for (const frame of Object.values(frameRefs.current)) {
      if (!frame?.contentWindow) continue;
      const r = frame.getBoundingClientRect();
      if (r.height <= 0) continue;
      let top = Math.max(0, -r.top);
      let height = Math.max(0, Math.min(r.height, window.innerHeight - r.top) - top);
      // ほとんど見えていないときも、ダイアログが潰れない高さは確保する
      const minVisible = Math.min(r.height, 320);
      if (height < minVisible) {
        top = r.top > 0 ? 0 : Math.max(0, r.height - minVisible);
        height = minVisible;
      }
      frame.contentWindow.postMessage({ type: 'yamato-game:viewport', top, height }, window.location.origin);
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sendViewport);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [sendViewport, heights, isFull, active]);

  // 全画面
  useEffect(() => {
    const onChange = () => setNativeFull(Boolean(containerRef.current) && fullscreenElement() === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // 画面いっぱい表示の間は後ろのページをスクロールさせない。Esc で戻る
  useEffect(() => {
    if (!pseudoFull) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPseudoFull(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [pseudoFull]);

  const toggleFullscreen = async () => {
    if (isFull) {
      setPseudoFull(false);
      if (fullscreenElement()) {
        const doc = document as FullscreenDoc;
        try {
          if (doc.exitFullscreen) await doc.exitFullscreen();
          else doc.webkitExitFullscreen?.();
        } catch {
          /* already exited */
        }
      }
      return;
    }
    const el = containerRef.current as FullscreenEl | null;
    if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch {
      /* fall back below */
    }
    // Fullscreen API がない・拒否された（iPhone、iframe の制限など）→ 画面いっぱいに広げる表示
    if (fullscreenElement() !== el) setPseudoFull(true);
  };

  return (
    <div
      ref={containerRef}
      className={isFull ? 'fixed inset-0 z-[1000] flex flex-col bg-white dark:bg-slate-950' : 'w-full'}
      style={pseudoFull ? { height: '100dvh' } : undefined}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 mr-1">{title}</span>
        {list.length > 1 && (
          <div role="group" aria-label="Version" className="inline-flex rounded-full border border-slate-300 dark:border-slate-700 overflow-hidden">
            {list.map((v) => (
              <button
                key={v.key}
                type="button"
                aria-pressed={active === v.key}
                onClick={() => setActive(v.key)}
                className={`px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  active === v.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          {isFull ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          {isFull ? 'Exit fullscreen' : 'Fullscreen'}
        </button>
      </div>

      <div className={isFull ? 'relative flex-1 min-h-0' : 'relative'}>
        {list.map((v) => (
          <iframe
            key={v.key}
            ref={(el) => {
              frameRefs.current[v.key] = el;
            }}
            src={srcs[v.key]}
            title={list.length > 1 ? `${title} (${v.label})` : title}
            className={`block w-full border-0 ${v.key === active ? '' : 'hidden'}`}
            style={{ height: isFull ? '100%' : Math.max(minHeight, heights[v.key] ?? minHeight) }}
            sandbox="allow-scripts allow-same-origin allow-forms"
            allow="fullscreen"
            onLoad={sendViewport}
          />
        ))}
      </div>
    </div>
  );
}
