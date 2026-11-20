/**
 * @file JigsawSetup.tsx
 * @description クラスのライブゲーム「みんなでジグソー」の準備（写真を選ぶ・ピースの数）
 *
 * 写真はサイトの写真集（浮世絵など）だけ。先生による写真のアップロードは 2026-11-21 に止めた
 * （個人情報が写った写真が公開の場所に置かれるのを防ぐため）。
 * 以前にアップロードした写真がある先生は、一覧に出るので ✕ で消せる。
 */
import React, { useEffect, useState } from 'react';
import { YAMATO_API_BASE, yamatoFetch } from '~/lib/yamatoApi';
import { PIECE_OPTIONS } from './Jigsaw';

export type JigsawImage = { id: string; title: string; credit: string | null; url: string; width: number; height: number; mine: boolean };

export function JigsawSetup({
  selected,
  onSelect,
  pieceCount,
  onPieceCount,
}: {
  selected: JigsawImage | null;
  onSelect: (image: JigsawImage | null) => void;
  pieceCount: number;
  onPieceCount: (n: number) => void;
}) {
  const [images, setImages] = useState<JigsawImage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await yamatoFetch(`${YAMATO_API_BASE}/api/live-game/jigsaw/images`);
        const data = (await res.json().catch(() => ({}))) as { images?: JigsawImage[]; error?: string };
        if (!res.ok || !data.images) throw new Error(data.error || `HTTP ${res.status}`);
        setImages(data.images);
      } catch (err: any) {
        setLoadError(err?.message || 'Could not load the pictures.');
      }
    })();
  }, []);

  // 以前に自分がアップロードした写真を消す（サイトの写真集の写真は消せない）
  const remove = async (img: JigsawImage) => {
    if (!window.confirm(`Delete "${img.title}"? This cannot be undone.`)) return;
    setDeletingId(img.id);
    setDeleteError(null);
    try {
      const res = await yamatoFetch(`${YAMATO_API_BASE}/api/live-game/jigsaw/images/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: img.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setImages((prev) => (prev ?? []).filter((i) => i.id !== img.id));
      if (selected?.id === img.id) onSelect(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Could not delete the picture.');
    } finally {
      setDeletingId(null);
    }
  };

  const option = (active: boolean) =>
    `px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition cursor-pointer ${
      active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
    }`;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Picture</p>
        {loadError && <p className="text-sm text-rose-600">{loadError}</p>}
        {!images && !loadError && <p className="text-sm text-slate-500">Loading pictures…</p>}
        {images && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative">
                <button
                  type="button"
                  onClick={() => onSelect(img)}
                  className={`w-full text-left rounded-xl border-2 overflow-hidden cursor-pointer transition ${
                    selected?.id === img.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img src={img.url} alt={img.title} className="w-full aspect-video object-cover" loading="lazy" />
                  <span className="block px-2 py-1 text-xs font-bold text-slate-700 truncate">{img.title}</span>
                  <span className="block px-2 pb-1 text-[10px] text-slate-400">{img.mine ? 'Your old upload (please delete)' : 'AI Yamato library'}</span>
                </button>
                {img.mine && (
                  <button
                    type="button"
                    onClick={() => remove(img)}
                    disabled={deletingId === img.id}
                    aria-label={`Delete ${img.title}`}
                    title="Delete this picture"
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 border border-slate-300 text-rose-600 text-sm font-bold shadow cursor-pointer disabled:opacity-40"
                  >
                    {deletingId === img.id ? '…' : '✕'}
                  </button>
                )}
              </div>
            ))}
            {!images.length && <p className="text-sm text-slate-500 col-span-full">No pictures are available right now.</p>}
          </div>
        )}
        {deleteError && <p className="text-sm text-rose-600 mt-2">{deleteError}</p>}
      </div>

      <div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Pieces</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PIECE_OPTIONS).map((n) => (
            <button key={n} type="button" onClick={() => onPieceCount(Number(n))} className={option(pieceCount === Number(n))}>
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Students get a piece for each correct answer and tap where it goes. A wrong spot or a pass sends the piece back to the bag.
          The game ends when the puzzle is complete or time runs out.
        </p>
      </div>
    </div>
  );
}
