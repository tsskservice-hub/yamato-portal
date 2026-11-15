/**
 * @file JigsawSetup.tsx
 * @description クラスのライブゲーム「みんなでジグソー」の準備（写真を選ぶ・アップロードする・ピースの数）
 *
 * 写真は、サイトの写真集（すべての先生が使える）と、その先生がアップロードした写真（その先生だけ）。
 * アップロードするときは「この画像を使う権利があります」に同意してもらう。
 */
import React, { useEffect, useState } from 'react';
import { YAMATO_API_BASE, yamatoFetch } from '~/lib/yamatoApi';
import { PIECE_OPTIONS } from './Jigsaw';

export type JigsawImage = { id: string; title: string; credit: string | null; url: string; width: number; height: number; mine: boolean };

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error('Could not read the image.'));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

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
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [credit, setCredit] = useState('');
  const [rights, setRights] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  const upload = async () => {
    if (!file || !title.trim() || !rights) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { width, height } = await readImageSize(file);
      const form = new FormData();
      form.append('file', file);
      form.append('title', title.trim());
      form.append('credit', credit.trim());
      form.append('rights', 'yes');
      form.append('width', String(width));
      form.append('height', String(height));
      const res = await yamatoFetch(`${YAMATO_API_BASE}/api/live-game/jigsaw/images`, { method: 'POST', body: form });
      const data = (await res.json().catch(() => ({}))) as { image?: JigsawImage; message?: string; error?: string };
      if (!res.ok || !data.image) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setImages((prev) => [data.image!, ...(prev ?? [])]);
      onSelect(data.image);
      setShowUpload(false);
      setFile(null);
      setTitle('');
      setCredit('');
      setRights(false);
    } catch (err: any) {
      setUploadError(err?.message || 'Could not upload the picture.');
    } finally {
      setUploading(false);
    }
  };

  // 自分がアップロードした写真を消す（サイトの写真集の写真は消せない）
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
                  <span className="block px-2 pb-1 text-[10px] text-slate-400">{img.mine ? 'Your picture' : 'AI Yamato library'}</span>
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
            {!images.length && <p className="text-sm text-slate-500 col-span-full">No pictures yet. Upload one below.</p>}
          </div>
        )}
        {deleteError && <p className="text-sm text-rose-600 mt-2">{deleteError}</p>}
        <button type="button" onClick={() => setShowUpload((v) => !v)} className="mt-3 text-sm font-bold text-indigo-600 underline cursor-pointer">
          {showUpload ? 'Cancel upload' : '+ Upload your own picture'}
        </button>
        {showUpload && (
          <div className="mt-3 space-y-2 rounded-xl border border-slate-200 p-3">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Title (e.g. Mt Fuji in spring)"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900"
            />
            <input
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              maxLength={200}
              placeholder="Credit / source (optional, shown when the puzzle is finished)"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900"
            />
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5" />
              <span>
                I have the right to use this picture in class (for example, I took it myself or it is free to use), and it does not show students’
                faces or personal information.
              </span>
            </label>
            <p className="text-[11px] text-slate-400">
              Many free stock photo sites do not allow their photos to be made into jigsaw puzzles. Please check the site’s licence, or use your
              own photos.
            </p>
            <p className="text-[11px] text-slate-400">
              JPEG, PNG or WebP, up to 5 MB. Only you can use pictures you upload, and you can delete them at any time.
            </p>
            {uploadError && <p className="text-sm text-rose-600">{uploadError}</p>}
            <button
              type="button"
              disabled={!file || !title.trim() || !rights || uploading}
              onClick={upload}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 cursor-pointer"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        )}
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
