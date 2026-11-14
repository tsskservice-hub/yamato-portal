/**
 * @file Jigsaw.tsx
 * @description クラスのライブゲーム「みんなでジグソー」：ピースの切り分けと、盤面の表示
 *
 * ・cutJigsaw: 先生のブラウザで、写真をジグソーの形（凸凹つき）に切り分ける。
 *   切ったピースはサーバーの部屋に渡し、どこに入るかはサーバーだけが持つ。
 * ・JigsawBoard: 盤面。置き終わったマスだけ絵が見え、空いているマスは枠だけ。
 *   生徒はピースを持っているとき、空いているマスをタップして置く。
 */
import React from 'react';

export type JigsawBoardInfo = {
  imageUrl: string;
  width: number;
  height: number;
  cols: number;
  rows: number;
  title: string;
  credit: string | null;
  placed: number[];
  total: number;
};

/** ピースの数 → よこ×たて（横長の写真。縦長なら入れ替える） */
export const PIECE_OPTIONS: Record<number, [number, number]> = { 24: [6, 4], 48: [8, 6], 80: [10, 8] };

export function gridFor(pieceCount: number, width: number, height: number): { cols: number; rows: number } {
  const [a, b] = PIECE_OPTIONS[pieceCount] ?? PIECE_OPTIONS[24];
  return width >= height ? { cols: a, rows: b } : { cols: b, rows: a };
}

/** 切り分けるときの写真の長い辺（大きすぎると重くなる） */
const CUT_LONG_SIDE = 1000;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the image.'));
    img.src = url;
  });
}

/**
 * 写真をピースに切り分ける。戻り値の slot は、左上から右へ数えたマスの番号。
 * 隣どうしのピースは、片方が出っ張り（凸）、もう片方がへこみ（凹）になる。
 */
export async function cutJigsaw(imageUrl: string, cols: number, rows: number): Promise<{ slot: number; data: string }[]> {
  const img = await loadImage(imageUrl);
  const scale = Math.min(1, CUT_LONG_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth * scale);
  const H = Math.round(img.naturalHeight * scale);
  const cw = W / cols;
  const ch = H / rows;
  const T = Math.min(cw, ch) * 0.22; // 出っ張りの高さ

  // 境目ごとに、出っ張りの向きを決める（+1: 右／下に出る、-1: 左／上に出る）
  const rand = () => (Math.random() < 0.5 ? 1 : -1);
  const hEdges = Array.from({ length: rows - 1 }, () => Array.from({ length: cols }, rand)); // 行と行の間
  const vEdges = Array.from({ length: rows }, () => Array.from({ length: cols - 1 }, rand)); // 列と列の間

  // 1 本の辺を描く。s: 外向きに出っ張る(1)／内向きにへこむ(-1)／まっすぐ(0)
  const edge = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, s: number) => {
    if (s === 0) {
      ctx.lineTo(x1, y1);
      return;
    }
    const L = Math.hypot(x1 - x0, y1 - y0);
    const ux = (x1 - x0) / L;
    const uy = (y1 - y0) / L;
    const nx = uy; // 時計回りに回るときの外向き
    const ny = -ux;
    const p = (a: number, b: number): [number, number] => [x0 + ux * a * L + nx * b * T * s, y0 + uy * a * L + ny * b * T * s];
    ctx.lineTo(...p(0.35, 0));
    ctx.bezierCurveTo(...p(0.4, 0.3), ...p(0.28, 1), ...p(0.5, 1));
    ctx.bezierCurveTo(...p(0.72, 1), ...p(0.6, 0.3), ...p(0.65, 0));
    ctx.lineTo(x1, y1);
  };

  const pieces: { slot: number; data: string }[] = [];
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(cw + 2 * T);
  canvas.height = Math.ceil(ch + 2 * T);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot cut the picture.');

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw;
      const y = r * ch;
      const top = r === 0 ? 0 : -hEdges[r - 1][c];
      const bottom = r === rows - 1 ? 0 : hEdges[r][c];
      const left = c === 0 ? 0 : -vEdges[r][c - 1];
      const right = c === cols - 1 ? 0 : vEdges[r][c];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(T - x, T - y);
      ctx.beginPath();
      ctx.moveTo(x, y);
      edge(ctx, x, y, x + cw, y, top);
      edge(ctx, x + cw, y, x + cw, y + ch, right);
      edge(ctx, x + cw, y + ch, x, y + ch, bottom);
      edge(ctx, x, y + ch, x, y, left);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      ctx.drawImage(img, 0, 0, W, H);
      ctx.restore();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.stroke();

      let data = canvas.toDataURL('image/webp', 0.85);
      if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/png');
      pieces.push({ slot: r * cols + c, data });
    }
  }
  return pieces;
}

/** 盤面。onPick を渡すと、空いているマスをタップできる */
export function JigsawBoard({
  board,
  onPick,
  highlight,
  showGuide = false,
}: {
  board: JigsawBoardInfo;
  onPick?: (slot: number) => void;
  /** 間違えたマスなどを一瞬目立たせる */
  highlight?: number | null;
  /** 薄く元の絵を見せる（先生の画面用ではなく、使わない） */
  showGuide?: boolean;
}) {
  const placed = new Set(board.placed);
  const cells = Array.from({ length: board.cols * board.rows }, (_, i) => i);
  return (
    <div className="relative w-full overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-800" style={{ aspectRatio: `${board.width} / ${board.height}` }}>
      {showGuide && <img src={board.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />}
      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${board.cols}, 1fr)`, gridTemplateRows: `repeat(${board.rows}, 1fr)` }}>
        {cells.map((slot) => {
          const r = Math.floor(slot / board.cols);
          const c = slot % board.cols;
          if (placed.has(slot)) {
            return (
              <div
                key={slot}
                style={{
                  backgroundImage: `url(${board.imageUrl})`,
                  backgroundSize: `${board.cols * 100}% ${board.rows * 100}%`,
                  backgroundPosition: `${board.cols === 1 ? 0 : (c / (board.cols - 1)) * 100}% ${board.rows === 1 ? 0 : (r / (board.rows - 1)) * 100}%`,
                }}
              />
            );
          }
          return onPick ? (
            <button
              key={slot}
              type="button"
              onClick={() => onPick(slot)}
              aria-label={`Row ${r + 1}, column ${c + 1}`}
              className={`border border-white/25 hover:bg-amber-300/40 transition cursor-pointer ${highlight === slot ? 'bg-rose-500/50' : 'bg-slate-700/60'}`}
            />
          ) : (
            <div key={slot} className="border border-white/15 bg-slate-700/60" />
          );
        })}
      </div>
    </div>
  );
}

/** 箱の絵（完成見本）。小さく出す */
export function JigsawBoxPicture({ board }: { board: JigsawBoardInfo }) {
  return (
    <figure className="space-y-1">
      <img src={board.imageUrl} alt={board.title} className="w-full rounded-lg border border-slate-200" />
      <figcaption className="text-[11px] text-slate-500 leading-snug">
        {board.title}
        {board.credit ? ` — ${board.credit}` : ''}
      </figcaption>
    </figure>
  );
}

export function progressPercent(board: JigsawBoardInfo) {
  return board.total ? Math.round((board.placed.length / board.total) * 100) : 0;
}
